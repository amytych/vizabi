//TODO: Improve the examples scripts -- too hardcoded
//TODO: Remove hardcoded references to variable myVizabi

//url params
function randomSize(id) {
    var width = Math.floor(Math.random() * 800) + 300;
    var height = Math.floor(Math.random() * 500) + 300;
    var container = document.getElementById(id);

    setSize(id, width, height);

    forceResizeEvt();
}

function phoneSize(id, mode) {
    var container = $("#" + id);
    if (mode === 'landscape') {
        container.width(568);
        container.height(320);
    } else {
        container.width(320);
        container.height(568);
    }
    container.removeClass('fullscreen');
    forceResizeEvt();
}

function fullSize(id) {
    var container = $("#" + id);
    container.width("auto");
    container.height("auto");
    container.addClass('fullscreen');
    forceResizeEvt();
}

function setSize(id, width, height, fullscreen) {
    var container = $("#" + id);

    container.width(width);
    container.height(height);
    if (fullscreen) {
        container.addClass('fullscreen');
    } else {
        container.removeClass('fullscreen');
    }
    forceResizeEvt();
}

function forceResizeEvt() {
    //force resize
    event = document.createEvent("HTMLEvents");
    event.initEvent("resize", true, true);
    event.eventName = "resize";
    window.dispatchEvent(event);

    updateURL();
}

function setLanguage(lang) {
    var options = {
        language: {
            id: lang
        }
    };
    myVizabi.setOptions(options);
}

function setCurrentState(idState) {
    if (!idState) {
        idState = "state";
    }
    var state = document.getElementById(idState).innerHTML;
    state = JSON.parse(state);
    forceState(state);
}

function forceState(state) {
    var newOption = {
        state: state
    };
    myVizabi.setOptions(newOption);
}

function showState(state, id) {
    if (!id) {
        id = "state";
    }

    // Format date objects according to the unit
    if (state.time && state.time.unit) {
        if (typeof state.time.value === 'object') {
            state.time.value = formatDate(state.time.value, state.time.unit);
        }
        if (typeof state.time.start === 'object') {
            state.time.start = formatDate(state.time.start, state.time.unit);
        }
        if (typeof state.time.end === 'object') {
            state.time.end = formatDate(state.time.end, state.time.unit);
        }
    }

    var container = document.getElementById(id);
    var str = JSON.stringify(state, null, 2);
    container.innerHTML = str;

    // updateURL();
}

function formatDate(date, unit) {
    var timeFormats = {
        "year": d3.time.format("%Y"),
        "month": d3.time.format("%Y-%m"),
        "week": d3.time.format("%Y-W%W"),
        "day": d3.time.format("%Y-%m-%d"),
        "hour": d3.time.format("%Y-%m-%d %H"),
        "minute": d3.time.format("%Y-%m-%d %H:%M"),
        "second": d3.time.format("%Y-%m-%d %H:%M:%S")
    };
    return timeFormats[unit](date);
}

function showQuery(query) {
    var container = document.getElementById("query");
    var str = JSON.stringify(query, null, 2);
    container.innerHTML = str;
}

function goToExample(example) {
    location.href = '../' + example + '.html';
    return;
}

function updateURL() {
    var url = {
        state: $("#state").text().replace(/(\s|\r\n|\n|\r)/gm, ""),
        width: $(".placeholder").width(),
        height: $(".placeholder").height(),
        fullscreen: $(".placeholder").hasClass('fullscreen')
    };
    url_string = JSON.stringify(url);
    location.href = "#" + url_string;
}

var url = {};

function parseURL() {
    var hash = window.location.hash;

    if (hash) {
        options = JSON.parse(hash.replace("#", ""));

        var placeholder = $(".placeholder").attr("id");


        console.error('TODO: parse attempt throws error when options.state is empty')
        console.error('see related issues #20 and #24')
        var state = ""; //should be JSON.parse(options.state);

        url.state = state;
        url.lang = options.lang;

        setSize(placeholder, options.width, options.height, options.fullscreen);

    }
}

function shareLink() {
    updateURL();
    var address = "https://api-ssl.bitly.com/v3/shorten",
        params = {
            access_token: "8765eb3be5b975830e72af4e0949022cb53d9596",
            longUrl: document.URL
        };
    $.getJSON(address, params, function(response) {
        if (response.status_code == "200") {
            prompt("Copy the following link: ", response.data.url);
        } else {
            console.log(response);
            alert("Copy the link from the browser");
        }
    });

}

/*dropdown*/
function DropDown(el) {
    this.dd = el;
    this.placeholder = this.dd.children('span');
    this.opts = this.dd.find('ul.dropdown > li');
    this.val = '';
    this.index = -1;
    this.initEvents();
}

DropDown.prototype = {
    initEvents: function() {
        var obj = this;

        obj.dd.on('click', function(event) {
            $(this).toggleClass('active');
            return false;
        });

        obj.opts.on('click', function() {
            var opt = $(this);
            obj.val = opt.text();
            obj.index = opt.index();
            obj.placeholder.text(obj.val);
        });
    },
    getValue: function() {
        return this.val;
    },
    getIndex: function() {
        return this.index;
    }
}

function viewOnGithub() {
    var url = window.location.pathname,
        branch,
        github_base = 'https://github.com/Gapminder/vizabi/tree/',
        github_tools_prepend = '/src/tools/',
        tool_path = url.substring(url.indexOf("preview_pages/") + 14, url.indexOf(".html"));

    // TODO: In development, there is no info about the branch in the URL. Can be improved by looking into https://github.com/notatestuser/gift
    if (url.indexOf('dist') >= 0 || url.indexOf('develop') >= 0) {
        branch = 'develop';
    }
    else {
        branch = url.substring(url.indexOf('feature'), url.indexOf('/preview_pages'));
    }

    window.open(github_base + branch + github_tools_prepend + tool_path, '_blank');
}

parseURL();

$(function() {

    $('.wrapper-dropdown').each(function() {
        new DropDown($(this));
    });

    $('.wrapper-dropdown').click(function() {
        $('.wrapper-dropdown').not(this).each(function() {
            $(this).removeClass('active');
        });
    });

    $(document).click(function() {
        // all dropdowns
        $('.wrapper-dropdown').removeClass('active');
    });

});