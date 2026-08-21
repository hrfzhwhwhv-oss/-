/*
  ちゃいろのこびん
  Google Apps Script版 ネットワーク同期

  ・GitHub Pages → GASへ接続
  ・GASを親機サーバーとして使用
  ・生徒iPadはGASをポーリング
  ・Macの時計とGASの時計差を補正
  ・STARTはGAS時刻を基準に同期
*/


(() => {

  /* =========================================
     Google Apps Script WebアプリURL
  ========================================= */

  const GAS_URL =
    "https://script.google.com/macros/s/AKfycbw686LKv9EeZZbAGqEPCBmbD-kexw3uMPCTk7uvsclVZg9cXcyXCRmIekOy-u1cdbKZ-g/exec";


  /* =========================================
     基本設定
  ========================================= */

  const listeners = new Set();

  let version = 0;
  let running = true;
  let connected = false;

  let clockOffsetMs = 0;
  let clockReady = false;
  let bestRttMs = Infinity;


  /* =========================================
     この端末のID
  ========================================= */

  const clientId =
    sessionStorage.getItem("chairo-client-id") ||
    `student-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  sessionStorage.setItem(
    "chairo-client-id",
    clientId
  );


  /* =========================================
     現在の楽器・パート
  ========================================= */

  function currentPartLabel() {

    try {

      const instrument =
        document
          .querySelector(
            ".instrument-button.selected-mode"
          )
          ?.textContent
          ?.trim() || "";

      const visibleGroups = [

        document.getElementById(
          "xylophoneModeButtons"
        ),

        document.getElementById(
          "bellModeButtons"
        ),

        document.getElementById(
          "bassModeButtons"
        )

      ].filter(
        (el) =>
          el &&
          !el.classList.contains("hidden")
      );


      const part =
        visibleGroups[0]
          ?.querySelector(
            ".part-button.selected-mode"
          )
          ?.textContent
          ?.trim() || "";


      return `${instrument} ${part}`.trim();

    } catch (_) {

      return "";

    }

  }


  /* =========================================
     状態通知
  ========================================= */

  function announce(extra = {}) {

    window.dispatchEvent(

      new CustomEvent(
        "chairo-network-status",
        {
          detail: {

            connected,

            clientId,

            clockReady,

            clockOffsetMs,

            bestRttMs:
              Number.isFinite(bestRttMs)
                ? bestRttMs
                : null,

            ...extra

          }
        }
      )

    );

  }


  /* =========================================
     GAS GET
  ========================================= */

  async function gasGet(api, params = {}) {

    const query =
      new URLSearchParams({

        api,

        ...params

      });


    const url =
      `${GAS_URL}?${query.toString()}`;


    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    return response.json();

  }


  /* =========================================
     GAS時刻測定
  ========================================= */

  async function sampleClock() {

    const t0 = Date.now();


    const payload =
      await gasGet("time", {
        _: t0
      });


    const t1 = Date.now();


    const serverNow =
      Number(payload.serverNow);


    const rtt =
      Math.max(
        0,
        t1 - t0
      );


    const midpoint =
      (t0 + t1) / 2;


    const offset =
      serverNow - midpoint;


    return {

      rtt,

      offset

    };

  }


  /* =========================================
     時計同期
  ========================================= */

  async function syncClock(
    sampleCount = 7
  ) {

    const samples = [];


    for (
      let i = 0;
      i < sampleCount;
      i += 1
    ) {

      try {

        samples.push(
          await sampleClock()
        );

      } catch (_) {}


      if (
        i <
        sampleCount - 1
      ) {

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              70
            )
        );

      }

    }


    if (!samples.length) {

      announce({
        clockError: true
      });

      return false;

    }


    /* RTTが小さいものを優先 */

    samples.sort(
      (a, b) =>
        a.rtt - b.rtt
    );


    const best =
      samples.slice(
        0,
        Math.min(
          3,
          samples.length
        )
      );


    const newOffset =
      best.reduce(
        (sum, item) =>
          sum + item.offset,
        0
      ) / best.length;


    const newBestRtt =
      best[0].rtt;


    if (!clockReady) {

      clockOffsetMs =
        newOffset;

    } else {

      clockOffsetMs =
        clockOffsetMs * 0.7 +
        newOffset * 0.3;

    }


    bestRttMs =
      newBestRtt;


    clockReady = true;


    announce();


    return true;

  }


  /* =========================================
     時刻変換
  ========================================= */

  function serverToLocalTime(
    serverTimestampMs
  ) {

    return (
      Number(serverTimestampMs) -
      clockOffsetMs
    );

  }


  function localToServerTime(
    localTimestampMs
  ) {

    return (
      Number(localTimestampMs) +
      clockOffsetMs
    );

  }


  /* =========================================
     ポーリング
  ========================================= */

  async function poll() {

    while (running) {

      try {

        const part =
          encodeURIComponent(
            currentPartLabel()
          );


        const payload =
          await gasGet(
            "poll",
            {

              after:
                version,

              client:
                clientId,

              part

            }
          );


        connected = true;


        announce();


        if (
          typeof payload.version ===
          "number"
        ) {

          version =
            Math.max(
              version,
              payload.version
            );

        }


        if (payload.command) {

          listeners.forEach(
            (listener) => {

              listener(
                payload.command
              );

            }
          );

        }


      } catch (error) {

        connected = false;


        announce({

          error:
            error?.message ||
            String(error)

        });


        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              1000
            )
        );

      }

    }

  }


  /* =========================================
     命令送信
     
     POSTではなくGETを使用。
     校内ネットワーク＋GASで扱いやすくする。
  ========================================= */

  async function send(
    command,
    data = {}
  ) {

    const sendData = {
      ...data
    };


    /*
      STARTの場合は
      GAS基準時刻で少し先の時刻を指定。

      これにより各iPadが
      同じ時刻を目標にスタートできる。
    */

    if (
      command === "start" &&
      !sendData.startAt
    ) {

      const localNow =
        Date.now();


      const serverNow =
        localToServerTime(
          localNow
        );


      /*
        1.5秒後を開始時刻にする。
        iPad側が命令を受け取る時間を確保。
      */

      sendData.startAt =
        serverNow + 1500;

    }


    const commandPayload =
      JSON.stringify({

        command,

        data: sendData

      });


    const payload =
      await gasGet(
        "command",
        {

          command:
            commandPayload

        }
      );


    return payload;

  }


  /* =========================================
     GASステータス
  ========================================= */

  async function getStatus() {

    return gasGet(
      "status"
    );

  }


  /* =========================================
     外部公開
  ========================================= */

  window.ChairoNetwork = {

    get connected() {

      return connected;

    },


    get clockReady() {

      return clockReady;

    },


    get clockOffsetMs() {

      return clockOffsetMs;

    },


    get bestRttMs() {

      return bestRttMs;

    },


    send,

    getStatus,

    syncClock,

    serverToLocalTime,

    localToServerTime,


    onCommand(listener) {

      listeners.add(
        listener
      );


      return () =>
        listeners.delete(
          listener
        );

    }

  };


  /* =========================================
     起動
  ========================================= */

  /*
    最初に時計を同期
  */

  syncClock(9);


  /*
    15秒ごとに時計を再調整
  */

  setInterval(
    () =>
      syncClock(5),
    15000
  );


  /*
    GASへ接続開始
  */

  poll();


})();
