// ==UserScript==
// @name           DCZzizilban
// @namespace      http://dczzb.daz.kr/
// @description    디씨찌질반 - 글/댓글 차단기
// @include        http://gall.dcinside.com/list.php*
// ==/UserScript==
////////////////////////////////////////////////////////////////////////////////
//
// DCZzizilBan(디씨찌질반) v 0.4.2
// Copyrighted by 땡칠도사 in 프로그래밍 갤러리
//
// Firefox 외의 브라우저 지원은 lum34님이 쓰신 IE용 스크립트를 참고하였습니다.
// 에미야고로님의 아이디어로 만들어졌습니다.
//
// 본 스크립트는 GPL에 따라 누구나 자유롭게 사용하고 배포 및 수정할 수 있습니다.
// GPL원문: http://www.fsf.org/licensing/licenses/gpl.html
//
////////////////////////////////////////////////////////////////////////////////

(function(){
function setConfig() {

///////////// 설정 /////////////
  Config = {
    // 일반 문자열 혹은 자바스크립트용 정규표현식을 사용할 수 있습니다. 
    // 각 항목에 해당하는 내용을 괄호안에 쓰시면 됩니다.
    // ex) Nickname: ["차단하기","원하는","닉네임"],
    // ID: ["일반문자열", /정규표현식/i, "자동인식"], ...

    // 완전히 차단할 닉네임 혹은 아이디입니다.
    Nickname: [],
    ID: [],
    // 닉네임: 게시판에 표시되는 이름
    // 아이디: 로그인할 때 사용하는 ID
    //         해당 사용자의 겔로그 주소의 끝부분이 ID입니다. 
    //         유동닉 사용자들은 ID가 없습니다.

    // 다음 목록에 있는 단어가 제목이나 댓글에 들어있으면 해당글을 차단합니다.
    Words: [],

    // 다음 목록의 사용자들은 차단에서 제외합니다.
    WhiteNickname: [],
    WhiteID: [],

    // 글과 댓글에 따로 차단을 적용할 수도 있습니다.
    NoThread_ID: [],
    NoThread_Nickname: [],

    NoComment_ID: [],
    NoComment_Nickname: [],

    // 댓글 목록이 변경될 경우, 다시 차단을 적용하기 위해 정해진 시간마다 자동으로
    // 차단 작업을 실행합니다. 컴퓨터가 느리다면 이 값을 증가시키는 것이 좋습니다.
    // 기본값: 750 / 단위: ms(밀리세컨드), 1000ms = 1초
    // ※ 괄호를 치거나 단위를 달지 마십시오.
    Interval: 750,

    // 부가적인 기능을 선택할 수 있습니다.
    // 사용 방법은 차단 아이디/닉네임 입력 방법과 비슷합니다.
    // ex) Options: [ShowFiltered],
    //       혹은
    //     Options: [ShowFiltered, HighlightWhites],

    // 현재 사용 가능한 기능은 다음과 같습니다:
    //   * ShowFiltered : 차단된 흔적을 남깁니다.
    //   * HighlightWhites : 화이트리스트에 있는 유저를 강조합니다.

    Options: [ShowFiltered, HighlightWhites],

    // 사용할 필터를 설정합니다.
    // 스크립트에 대한 이해 없이는 건드리지 않는 것이 좋습니다.
    ThreadFilters:  [isWhiteUser, isBannedUser, isBannedWord, isBannedUser_Thread],
    CommentFilters: [isWhiteUser, isBannedUser, isBannedWord, isBannedUser_Comment]

  };
}


////////////////////////////////////////////////////////////////////////////////
//
// 코드의 시작입니다. 
// 주석을 영문으로 쓰는건 오랫동안 지켜온 습관입니다... [먼산] */
//
////////////////////////////////////////////////////////////////////////////////
//
// Types
//

function Content (type, text, nickname, id, object) {
  this.type = type;
  this.text = text;
  this.nickname = nickname;
  this.id = id;
  this.object = object;
}

function Filter (f, action) {
  this.f = f;
  this.action = action;
}

////////////////////////////////////////////////////////////////////////////////
//
// Filters
//
// myFilter = new Filter
//   (
//     f     : function(Content) -> boolean,
//     action: function(Content) -> void
//   );
//
// If 'f' returns true, 'action' will be executed.
// Both *MUST* be functions with only 1 parameter, whose type is 'Content'.
//

var isWhiteUser = new Filter(
  function (c) {
    return ( array_has (Config.WhiteNickname, c.nickname) ||
             array_has (Config.WhiteID      , c.id      ) );
  },
  function (c) {
    // do nothing if the user is in the whitelist. 
  }
);

var isBannedUser = new Filter(
  function (c) {
    return ( array_has (Config.ID, c.id) ||
             array_has (Config.Nickname, c.nickname) );
  },
  function (c) { deleteContent (c); }
);

var isBannedWord = new Filter(
  function (c) {
    if (array_filter (Config.Words, cmpf(c.text)).length == 0)
      return false;
    return true;
  },
  function (c) { deleteContent (c); }
);

isBannedUser_Thread = new Filter(
  function (c) {
    return ( array_has (Config.NoThread_ID  , c.id      ) ||
             array_has (Config.NoThread_Nickname, c.nickname) );
  },
  function (c) { deleteContent (c); }
);

isBannedUser_Comment = new Filter(
  function (c) {
    return ( array_has (Config.NoComment_ID  , c.id      ) ||
             array_has (Config.NoComment_Nickname, c.nickname) );
  },
  function (c) { deleteContent (c); }
);

////////////////////////////////////////////////////////////////////////////////
//
// Helpers
//
// These functions are useful when writing filters.
//

var delbuf = new Array();
// This buffer stores the object to be deleted.
// plz don't access this directly from filters.

function deleteContent (c) {
  // Adds an object to delbuf
  delbuf.push (c);
}

function array_map (arr, f) {
  // apply 'f' to all the members of array 'arr'
  for (var i in arr)
    arr[i] = f(arr[i]);
  return arr; 
}

function array_filter (arr, f) {
  // apply filter 'f' to array 'arr', and return the result.
  // if 'f(arr[i])' returns false, the member will be remove from 'arr'
  var narr = new Array();
  for (var i in arr) 
    if (f (arr[i]))
      narr.push(arr[i]); 
  return narr; 
}

function array_has (arr, obj) {
  // Check if the array has the given object */
  return ( array_filter(arr, cmpf_equal(obj)).length > 0 );
}

function cmpf (text) {
  // (C)o(M)(P)are (F)unction - A dark magic
  // Returns a function which matches the given text with string/regexp.
  return function(pat) {
    if (pat.constructor.prototype === String.prototype) {
      if (text.indexOf(pat) >= 0)
        return true;
    } else if (pat.constructor.prototype === RegExp.prototype) { 
      if (text.search(pat) >= 0)
        return true;
    }
    return false;
  };
}

function cmpf_equal (str) {
  // Returns a function that checks the equality.
  return function(word) {
    if (word.constructor.prototype === String.prototype) {
      if (str.length == word.length && str.indexOf(word) == 0)
        return true;
    } else if (word.constructor.prototype === RegExp.prototype) {
      if (str.replace(word, "").length == 0)
        return true;
    }
    return false;
  }
}

////////////////////////////////////////////////////////////////////////////////
//
// Options
//
// Options directly modifies variables/functions.
//

function ShowFiltered ()
{
  flush_delbuf = function() {
    array_map(delbuf, function(c) {
      var o = c.object;
      if (c.type == 't') {
        o.cells[2].innerHTML = "<font color=\"gray\">&nbsp;&nbsp;ⓧ&nbsp;&nbsp;해당 글은 차단되었습니다.</font>";
        o.cells[3].innerHTML = "<b>차단돌이</b>";
      } else if (c.type == 'c') {
        o.cells[0].innerHTML = "<b>차단돌이</b>";
        o.cells[1].innerHTML = "<font color=\"gray\">해당 댓글은 차단되었습니다.</font>";
      }
    }); 
    delete delbuf;
    delbuf = new Array();
  };
}

function HighlightWhites () {
  isWhiteUser.action = function(c) {
    if (c.type == 't')
      c.object.cells[3].style.background="#98fb98";
    else 
      c.object.cells[0].style.background="#98fb98";
  }
}

////////////////////////////////////////////////////////////////////////////////
//
// Parsers
//

function is_ReadingThread() {
  var no = document.getElementsByName('no');
  if (no && no[0])
    return true;
  return false;
}

function getThreadList () {
  return array_map(
    array_filter(
      document.getElementById('list_table').rows,
      function(obj) {
        return (obj && obj.getElementsByTagName('SPAN').length > 0)
      }
    ),
    function(row) {
      var user = row.cells[3].querySelector('a');
      var title = row.cells[2].querySelector('a').innerHTML;
      return new Content('t', title, user.title, user.name, row);
    }
  );
}

function getCommentList () {
  var no = document.getElementsByName('no')[0].value;
  return array_map(
    document.querySelector('.comment-table').rows,
    function(row) {
      var user = row.querySelector('.com_name>span');
      var comment = row.querySelector('.com_text>div').firstChild;
      return new Cotent('c', comment, user.title, user.name, row);
    }
  );
}

function flush_delbuf () {
  // Delete contents in 'delbuf'
  array_map(
    delbuf, 
    function(c) {
      var tbl = c.object.parentNode;
      var idx = c.object.rowIndex;
      tbl.deleteRow(idx);
      if (c.type == 't') {
        // remove separator
        tbl.deleteRow(idx);
      }
    }
  ); 
  delete delbuf;
  delbuf = new Array();
}

////////////////////////////////////////////////////////////////////////////////

function applyFilters (list, filters) {
  for (var i in list)
    for (var j in filters)
      if (filters[j].f (list[i]))
        {
          filters[j].action (list[i]);
          break;
        }
}

function clearThreadList() {
  applyFilters (getThreadList(), Config.ThreadFilters);
  flush_delbuf();
}

function clearCommentList() {
  applyFilters (getCommentList(), Config.CommentFilters);
  flush_delbuf();
}

////////////////////////////////////////////////////////////////////////////////
//
// Main
//

var Config; setConfig();
Config.Done = false;

// apply 'Options'
(function () {
  for (var i in Config.Options)
    (Config.Options[i])();
})();

zzbmain = (function () {
  // ietoy does not guarranty the excution point.
  // so we have to wait untill the page is completly loaded.
  if (Config.Done) return;

  // check if the list is loaded.
  // this prevents some pointless errors
  if (document.getElementById('TB')) {
    Config.Done = true;
    clearThreadList();

    if (is_ReadingThread()) {
      clearCommentList();
      setInterval (clearCommentList, Config.Interval);
    }
  } else
    setTimeout(zzbmain, Config.Interval);
});
zzbmain();

})();

