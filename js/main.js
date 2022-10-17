/**
 * parallax
 */
var parallax = function () {
  $(window).stellar();
};

/**
 * waypoint
 */
var contentWayPoint = function () {
  $(".animate-box").css("opacity", 0); //非表示にしておく
  // scroll down
  $(".animate-box").waypoint(
    function (direction) {
      let target = $(this.element);
      if (direction === "down") {
        target.css("opacity", 1);
        target.addClass("animate__animated animate__fadeInUp animate__faster");
      }
      if (direction === "up") {
        $(".animate-box").css("opacity", 0);
        target.removeClass(
          "animate__animated animate__fadeInUp animate__faster"
        );
      }
    },
    {
      offset: "90%",
    }
  );
};

/**
 * Loading page
 * 見た目だけ。意味は無い
 */
var loaderPage = function () {
  $(".fh5co-loader").fadeOut("slow");
};
/**
 * 今年をセットする
 */
let setToday = function () {
  let date = new Date().getFullYear();
  $(".today").text(date);
};
/**
 * clickするとバウンスする
 */
$("#profile-logo").on("click", function () {
  $(this).removeClass("animate__animated animate__flip animate__repeat-2");
  $(this)
    .addClass("animate__animated animate__rubberBand")
    .delay(1000)
    .queue(function (next) {
      $(this).removeClass(
        "animate__animated animate__flip animate__repeat-2 animate__animated animate__rubberBand"
      );
      next();
    });
});

/**
 * グラフ系
 */
function graph() {
  const font = "Walter Turncoat";
  const options = {
    // axisFontSize: '1.2rem', //軸のラベルのフォントサイズ。デフォルト：'1rem'。
    axisRoughness: 1, // x軸とy軸の粗さ。デフォルト：0.5。
    axisStrokeWidth: 2, // x軸とy軸のストローク幅。 デフォルト： 0.5。
    bowing: 1, //チャートのお辞儀。 デフォルト： 0。
    // color: 'skyblue', //各バーの色。 デフォルト： 'skyblue'。
    fillStyle: "zigzag", //バー塗りつぶしスタイル。 上記のfillStylesのいずれかである必要があります。
    fillWeight: 1, //内側のパスの色の重み。 デフォルト： 0.5。
    font: font, //使用するフォントファミリ。 を使用するか、 を使用するか、 0 またはgaeguを使用することができます。 またはそれを何か他のものに与えます。 デフォルト：。 Gaegu1indie flowerIndie FlowerGaegu
    // highlight[文字列]: 1, //ホバーした各バーの色。 デフォルト： 'coral'。
    // innerStrokeWidth: 1, //バー内のパスのストローク幅。 デフォルト： 1。
    // interactive: true, //チャートがインタラクティブかどうか。 デフォルト： true。
    // labelFontSize: '1rem', //軸のラベルのフォントサイズ。 デフォルト： '1rem'。
    // margin: {
    //     top: 50,
    //     right: 20,
    //     bottom: 70,
    //     left: 90
    // }, //マージンオブジェクト。 デフォルト： {top: 50, right: 20, bottom: 70, left: 100}
    padding: 0.3, //バー間のパディング。 デフォルト： 0.1。
    roughness: 2, //チャートの粗さレベル。 デフォルト： 1。
    // simplification: 5, //グラフの簡略化。 デフォルト0 .2。
    stroke: "white", //バーのストロークの色。 デフォルト： black。
    strokeWidth: 1, //バーのストロークのサイズ。 デフォルト： 1。
    // title: 'Front End', //グラフのタイトル。 オプション。
    titleFontSize: "1.6rem", //チャートタイトルのフォントサイズ。 デフォルト： '1rem'。
    // tooltipFontSize: '1rem', //ツールチップのフォントサイズ。 デフォルト： '0.95rem'。
    // xLabel[文字列]: 1, //x軸のラベル。
    // yLabel[文字列]: 1, //y軸のラベル。
  };
  new roughViz.BarH({
    element: "#front-end",
    title: "Front End",
    data: {
      labels: ["HTML", "CSS", "JS", "Jquery", "TS", "Vue", "React", "Angular"],
      values: [3, 3, 3, 3, 3, 2, 3, 1],
    },
    ...options,
  });

  new roughViz.BarH({
    element: "#back-end",
    title: "Back End",
    data: {
      labels: [
        "PHP",
        "Laravel",
        "CakePHP",
        "Ruby",
        "Rails",
        "C",
        "C#",
        "Python",
        "VBA",
      ],
      values: [3, 3, 3, 2, 2, 1, 1, 1, 3],
    },
    ...options,
    color: "coral",
    highlight: "skyblue",
  });

  new roughViz.BarH({
    element: "#infrastructure",
    title: "Infrastructure",
    data: {
      labels: [
        "MySQL",
        "PostgreSQL",
        "Bat",
        "Apache",
        "Nginx",
        "AWS",
        "Docker",
      ],
      values: [3, 3, 2, 3, 2, 2, 2],
    },
    ...options,
    color: "lightgreen",
    highlight: "skyblue",
  });
}

/**
 * roughVizのx軸の少数を削除
 */
function DeleteFloat() {
  /**
   * 整数チェック
   * @param {number} val
   * @returns
   */
  function isInteger(val) {
    var pattern = /^\d*$/;
    return pattern.test(val);
  }
  // x軸の少数を削除
  $("[class^='xAxis'] text").each(function (index, element) {
    value = $(element).text();
    if (!isInteger(value)) {
      $(element).hide();
    }
    return element.value;
  });
}

$(function () {
  contentWayPoint();
  loaderPage();
  parallax();
  setToday();
  graph();
  DeleteFloat();
});
