;
(function () {

    'use strict';

    var isMobile = {
        Android: function () {
            return navigator.userAgent.match(/Android/i);
        },
        BlackBerry: function () {
            return navigator.userAgent.match(/BlackBerry/i);
        },
        iOS: function () {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        Opera: function () {
            return navigator.userAgent.match(/Opera Mini/i);
        },
        Windows: function () {
            return navigator.userAgent.match(/IEMobile/i);
        },
        any: function () {
            return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
        }
    };


    var fullHeight = function () {

        if (!isMobile.any()) {
            $('.js-fullheight').css('height', $(window).height());
            $(window).resize(function () {
                $('.js-fullheight').css('height', $(window).height());
            });
        }
    };

    // Parallax
    var parallax = function () {
        $(window).stellar();
    };

    // var contentWayPoint = function () {
    //     $('.animate-box').waypoint(function (direction) {
    //         if (direction === 'down' && !$(this.element).hasClass('animated-fast')) {
    //             $(this.element).addClass('item-animate');
    //             setTimeout(function () {
    //                 $('body .animate-box .item-animate').each(function (k) {
    //                     var el = $(this);
    //                     setTimeout(function () {
    //                         var effect = el.data('animate-effect');
    //                         if (effect === 'fadeIn') {
    //                             el.addClass('animate__animated animate__fadeIn animated-fast');
    //                         }
    //                         if (effect === 'fadeInLeft') {
    //                             el.addClass('animate__animated animate__fadeInLeft animated-fast');
    //                         }
    //                         if (effect === 'fadeInRight') {
    //                             el.addClass('animate__animated animate__fadeInRight animated-fast');
    //                         }
    //                         el.addClass('animate__animated animate__fadeInUp animated-fast');

    //                         el.removeClass('item-animate');
    //                     }, k * 100, 'easeInOutExpo');
    //                 });
    //             }, 50);
    //         }
    //     }, {
    //         offset: '85%'
    //     });
    // };


    // var pieChart = function () {
    //     $('.chart').easyPieChart({
    //         scaleColor: false,
    //         lineWidth: 4,
    //         lineCap: 'butt',
    //         barColor: 'green',
    //         trackColor: "#f5f5f5",
    //         size: 160,
    //         animate: 1000
    //     });
    // };

    // var skillsWayPoint = function () {
    //     if ($('#fh5co-skills').length > 0) {
    //         $('#fh5co-skills').waypoint(function (direction) {

    //             if (direction === 'down' && !$(this.element).hasClass('animated')) {
    //                 setTimeout(pieChart, 400);
    //                 $(this.element).addClass('animated');
    //             }
    //         }, {
    //             offset: '90%'
    //         });
    //     }
    // };


    // Loading page
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

    // let inview = function () {
    //     $('.animate-box').on('inview', function (event, isInView) {
    //         if (isInView) {
    //             //表示領域に入った時
    //             $(this).addClass('animate__animated animate__fadeInUp');
    //         } else {
    //             //表示領域から出た時
    //             $(this).removeClass('animate__animated animate__fadeInUp');
    //             $(this).addClass('animate__animated animate__fadeOutUp');
    //             $(this).css('opacity', 0); //非表示にしておく
    //         }
    //     });
    // };

    let locomotive = function () {
        let scroll = new LocomotiveScroll();
     }


    $(function () {
        // contentWayPoint();
        loaderPage();
        fullHeight();
        parallax();
        // pieChart();
        // skillsWayPoint();
        setToday();
        // inview();
    });


}());
