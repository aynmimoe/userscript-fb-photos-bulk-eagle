// ==UserScript==
// @name         Facebook Photos Bulk Eagle
// @name:zh      批次下载多張Facebook图片到Eagle
// @namespace    https://github.com/aynmimoe/userscript-fb-photos-bulk-eagle
// @version      0.7
// @description  請在Facebook單張圖片畫面中重新整理，會出現下載按鈕，再點下去輸入想匯入的張數，就會匯入進Eagle
// @author       Aiyin Mi
// @icon         https://cn.eagle.cool/favicon.png
// @connect      localhost
// @match        https://www.facebook.com/*/photos/*
// @match        https://www.facebook.com/photo.php?*
// @match        https://www.facebook.com/photo?*
// @match        https://www.facebook.com/photo/*
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addElement
// @require      https://code.jquery.com/jquery-3.5.1.min.js
// ==/UserScript==

const ISNEXT = false;

const SELECTOR_Author = 'body>div:nth-child(2)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(4)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(2)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(2)>div:nth-child(1)>div:nth-child(1)>span>div>h2';
const SELECTOR_Annotation = 'body>div:nth-child(2)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(4)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(2)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(2)>span';

// Eagle API 服务器位置
const EAGLE_SERVER_URL = "http://localhost:41595";
const EAGLE_IMPORT_API_URL = `${EAGLE_SERVER_URL}/api/item/addFromURL`;

const container = 'div[aria-label="放大"]';

// TODO
const HEADERS = {
  "referer": "https://www.facebook.com"
  // "sec-fetch-dest": "image",
  // "sec-fetch-mode": "no-cors",
  // "sec-fetch-site": "cross-site",
};

var iter = 0;
var MAXITER = 3;
const isDebug = false;

(function(){
  let timer = setInterval(addFetchBtn, 500);

  // 新增匯入按鈕
  function addFetchBtn() {
    if (document.querySelector(container)) {
      if (isDebug) console.log('Get the specified container!') ;
      let myFetchBtn = document.createElement("div");
      myFetchBtn.id = "my-fetch-eagle-btn";
      myFetchBtn.innerHTML = "⇩ Fetch";
      myFetchBtn.style.cssText = 'z-index:100;border-radius:15px;background-color:lightgray;padding: 8px 16px;align-self:center;cursor: pointer;';
      myFetchBtn.addEventListener("click", callbatchprocess);
      document.querySelector(container).parentElement.parentElement.prepend(myFetchBtn);
      clearInterval(timer);
    } else {
      if (isDebug) console.error('Cannot query the specified container!')
    };
  };
})();


function getImageUrl(){
    return document.querySelector('img[data-visualcompletion]').src;
};

function getAuthor(){
  return document.querySelector(SELECTOR_Author).textContent;
};

// 抓描述的第一行字
function getTitle(){
  let ele = document.querySelector(SELECTOR_Annotation);

  if(ele === null){
    return ele;
  }
  else {
    let firstLine = document.querySelector(SELECTOR_Annotation).innerHTML.split("<br")[0];
    let text = firstLine.split("<br")[0].replace(/<[^>]+>/g, '');
    return text;
  }
};

function getAnnotation(){
  let ele = document.querySelector(SELECTOR_Annotation);

  if(ele === null){
    return ele;
  }
  else {
    // 如果有「查看更多」就展開
    let ele_more = ele.querySelector('div[role~=button]');

    if (ele_more !== null) {
      let textO = ele.textContent;
      text = textO.slice(0, -4);
    }
    else {
      text = ele.textContent;
    }

    return text;
  }
};

function getWebUrl(){
  return document.URL;
};

// Facebook有做混淆，先不使用
function getDateTime(){
  return document.querySelector('body>div:nth-child(2)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(4)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(2)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(1)>div:nth-child(2)>div:nth-child(1)>div:nth-child(2)>span>span>span:nth-child(2)>span')
};

function getCommonInfo(){

  // var data = {
  //     "url": "<圖片本體網址>",
  //     "name": "<標題>",
  //     "annotation": "<描述>",
  //     "website": "<來源網址>",
  //     "tags": ["Illustration", "Design"],
  //     "modificationTime": 1591325171766,
  //   "headers": {
  //     "referer": "dribbble.com"
  //   }
  // };
  // var data = {
  //     "url": "https://cdn.dribbble.com/users/674925/screenshots/12020761/media/6420a7ec85751c11e5254282d6124950.png",
  //     "name": "Work",
  //     "annotation": "描述",
  //     "website": "https://dribbble.com/shots/12020761-Work",
  //   "headers": HEADERS
  // };

  // 標題
  let name = getTitle();
  if(name === undefined){
      name = document.title;
  }

  //获取描述(Eagle2.0版本以下因bug无法生效)
  let annotation = getAnnotation();

  var data = {
      "url": getImageUrl(),
      "name": name,
      "annotation": annotation,
      "website": getWebUrl(),
      "headers": HEADERS
  };

  return data;
}

function download(data){
  // console.log(data);
  if(!data) return;
  GM_xmlhttpRequest({
      url: EAGLE_IMPORT_API_URL,
      method: "POST",
      data: JSON.stringify(data),
      onload: function(response) {
          if(response.statusText !== "OK"){
              console.log(`请检查eagle是否打开！`);
              console.log(response);
              console.log(data);
              alert("下载失败！")
          }
      }
  });
}

function expandThreeDots(){
    document.querySelector('[aria-label="可對此貼文採取的動作"]').click();
};

function getCaption(){
    return document.querySelector("#fbPhotoSnowliftCaption > span").innerText;
};

function nextImage(){
    if (!ISNEXT) {
      document.querySelector('[aria-label="上一張相片"]').click();
    } else {
      document.querySelector('[aria-label="下一張相片"]').click();
    }
    iter++;
    if (iter < MAXITER) {
        setTimeout(function(){
            batchprocess();
        }, 1000);
    };
}

function batchprocess(){

  // 如果有「查看更多」，就展開
  let ele = document.querySelector(SELECTOR_Annotation);
  if(ele !== null){
    // 如果有「查看更多」就展開
    let ele_more = ele.querySelector('div[role~=button]');

    if (ele_more !== null) {
      ele_more.click(); // 點擊「查看更多」
    }
  }

  setTimeout(function(){
    let postData = getCommonInfo();
    download(postData);
  }, 10);

  setTimeout(function(){
    nextImage();
  }, 500);

  // expandThreeDots();
  // let timer = setInterval(processEach, 500);
  // function processEach(){
  //   let imgUrl = getImageUrl();
  //   if (imgUrl) {
  //     clearInterval(timer);
  //     var filename = imgUrl.match(/\/.+\/(.+)\?/)[1];
  //     console.log(filename)
  //     console.log("iter " + iter + ": " + imgUrl + ", " + filename);
  //     GM_download({'url': imgUrl, 'name': filename, 'saveAs': false});
  //     setTimeout(function(){
  //       nextImage();
  //     }, 500);
  //   }
  // };
};

function callbatchprocess(){
    iter = 0;
    MAXITER = prompt("How many photos to fetch:", "3");
    batchprocess();
}