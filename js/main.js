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
    $('.animate-box').css('opacity', 0); //非表示にしておく
    // scroll down
    $('.animate-box').waypoint(function (direction) {
        let target = $(this.element);
        if (direction === 'down') {
            target.css('opacity', 1);
            target.addClass('animate__animated animate__fadeInUp animate__faster');
        }
        if (direction === 'up') {
            $('.animate-box').css('opacity', 0);
            target.removeClass('animate__animated animate__fadeInUp animate__faster');
        }
    }, {
        offset: '90%'
    });
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
    $('.today').text(date);
}
/**
 * clickするとバウンスする
 */
$('#profile-logo').on('click', function () {
    $(this).removeClass('animate__animated animate__flip animate__repeat-2');
    $(this).addClass('animate__animated animate__rubberBand').delay(1000).queue(function (next) {
        $(this).removeClass('animate__animated animate__flip animate__repeat-2 animate__animated animate__rubberBand');
        next();
    });
});

$(function () {
    contentWayPoint();
    loaderPage();
    parallax();
    setToday();
});