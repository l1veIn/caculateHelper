/*
Tencent is pleased to support the open source community by making Face-2-Face Translator available.

Copyright (C) 2018 THL A29 Limited, a Tencent company. All rights reserved.

Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
http://opensource.org/licenses/MIT

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

const app = getApp()

const util = require('../../utils/util.js')

const plugin = requirePlugin("WechatSI")
// import {Function,evaluate} from '../../utils/eval5.js'; //or 'path/eval5.js'
import {
  language
} from '../../utils/conf.js'


// 获取**全局唯一**的语音识别管理器**recordRecoManager**
const manager = plugin.getRecordRecognitionManager()


Page({
  data: {
    dialogList: [
      // {
      //   // 当前语音输入内容
      //   create: '04/27 15:37',
      //   lfrom: 'zh_CN',
      //   lto: 'en_US',
      //   text: '这是测试这是测试这是测试这是测试',
      //   translateText: 'this is test.this is test.this is test.this is test.',
      //   voicePath: '',
      //   translateVoicePath: '',
      //   autoPlay: false, // 自动播放背景音乐
      //   id: 0,
      // },
    ],
    scroll_top: 10000, // 竖向滚动条位置

    bottomButtonDisabled: false, // 底部按钮disabled

    tips_language: language[0], // 目前只有中文

    initTranslate: {
      // 为空时的卡片内容
      create: '04/27 15:37',
      text: '等待说话',
    },

    currentTranslate: {
      // 当前语音输入内容
      create: '04/27 15:37',
      text: '等待说话',
    },
    recording: false, // 正在录音
    recordStatus: 0, // 状态： 0 - 录音中 1- 翻译中 2 - 翻译完成/二次翻译

    toView: 'fake', // 滚动位置
    lastId: -1, // dialogList 最后一个item的 id
    currentTranslateVoice: '', // 当前播放语音路径

  },


  /**
   * 按住按钮开始语音识别
   */
  streamRecord: function (e) {
    // console.log("streamrecord" ,e)
    let detail = e.detail || {}
    let buttonItem = detail.buttonItem || {}
    manager.start({
      lang: buttonItem.lang,
    })

    this.setData({
      recordStatus: 0,
      recording: true,
      currentTranslate: {
        // 当前语音输入内容
        create: util.recordTime(new Date()),
        text: '正在聆听中',
        lfrom: buttonItem.lang,
        lto: buttonItem.lto,
      },
    })
    this.scrollToNew();

  },


  /**
   * 松开按钮结束语音识别
   */
  streamRecordEnd: function (e) {

    // console.log("streamRecordEnd" ,e)
    let detail = e.detail || {} // 自定义组件触发事件时提供的detail对象
    let buttonItem = detail.buttonItem || {}

    // 防止重复触发stop函数
    if (!this.data.recording || this.data.recordStatus != 0) {
      console.warn("has finished!")
      return
    }

    manager.stop()

    this.setData({
      bottomButtonDisabled: true,
    })
  },
  eval(str) {
    function isOperator(value) {
      var operatorString = "+-*/()^";
      return operatorString.indexOf(value) > -1
    }

    function getPrioraty(value) {
      switch (value) {
        case '+':
        case '-':
          return 1;
        case '*':
        case '/':
          return 2;
        case '^':
          return 3;
        default:
          return 0;
      }
    }

    function prioraty(o1, o2) {
      return getPrioraty(o1) <= getPrioraty(o2);
    }

    function dal2Rpn(exp) {
      exp=exp+'+0'
      var inputStack = [];
      var outputStack = [];
      var outputQueue = [];
      let res = '';
      for (var i = 0, len = exp.length; i < len; i++) {
        var cur = exp[i];
        if (cur != ' ') {
          res = res + cur;
          if (i + 1 < exp.length) {
            if (isOperator(exp[i])) {
              inputStack.push(res);
              res = ''
            } else {
              if (isOperator(exp[i + 1])) {
                inputStack.push(res);
                res = ''
              }
            }
          } else {
            inputStack.push(res);
            res = ''
          }
        }
      }

      while (inputStack.length > 0) {
        var cur = inputStack.shift();
        if (isOperator(cur)) {
          if (cur == '(') {
            outputStack.push(cur);
          } else if (cur == ')') {
            var po = outputStack.pop();
            while (po != '(' && outputStack.length > 0) {
              outputQueue.push(po);
              po = outputStack.pop();
            }
            if (po != '(') {
              throw "error: unmatched ()";
            }
          } else {
            while (prioraty(cur, outputStack[outputStack.length - 1]) && outputStack.length > 0) {
              outputQueue.push(outputStack.pop());
            }
            outputStack.push(cur);
          }
        } else {
          outputQueue.push(new Number(cur));
        }
      }

      if (outputStack.length > 0) {
        if (outputStack[outputStack.length - 1] == ')' || outputStack[outputStack.length - 1] == '(') {
          throw "error: unmatched ()";
        }
        while (outputStack.length > 0) {
          outputQueue.push(outputStack.pop());
        }
      }

      return outputQueue;

    }
    function evalRpn(rpnQueue) {
      var outputStack = [];
      while (rpnQueue.length > 0) {
        var cur = rpnQueue.shift();

        if (!isOperator(cur)) {
          outputStack.push(cur);
        } else {
          if (outputStack.length < 2) {
            throw "unvalid stack length";
          }
          var sec = outputStack.pop();
          var fir = outputStack.pop();

          outputStack.push(getResult(fir, sec, cur));
        }
      }
      if (outputStack.length != 1) {
        throw "unvalid expression";
      } else {
        return outputStack[0];
      }
    }
    function getResult(first, second, operator) {
      var result = 0;
      switch (operator) {
        case '+':
          result = first + second;
          break;
        case '-':
          result = first - second;
          break;
        case '*':
          result = first * second;
          break;
        case '/':
          result = first / second;
          break;
        case '^':
          result = Math.pow(first, second);
          break;
        default:
          return 0;
      }

      //浮点数的小数位超过两位时，只保留两位小数点
      function formatFloat(f, digit) {
        //pow(10,n) 为 10 的 n 次方
        var m = Math.pow(10, digit);
        return parseInt(f * m, 10) / m;
      }
      return (formatFloat(result, 2));
    }
    return evalRpn(dal2Rpn(str))
  },
  showAbout(){
    let that = this
    that.setData({
      showAbout:true
    })
  },
  finish(){
    let that = this
    that.setData({
      showAbout:false
    })
  },
  /**
   * 翻译
   */
  caculate(string) {
    let that = this
    string = string.replace(/[^0-9一二三四五六七八九零十百千亿加减乘除以第个的平方次方立方分之\/\*\+\-\.]/g, "")
    // console.log(string)
    if (string != '') {
      let res = that.toMath(string)
      console.log('res',res)
      if(escape(res).indexOf( "%u" )<0){
        // console.log('ecal',that.eval(res))
        return res + '=' + that.eval(res)
      }else{
        return res
      }
    } else {
      return '对不起我没有听懂'
    }
  },
  toMath: function (str) {
    let that = this
    let toMath = that.toMath
    let ChineseToNumber = that.zhToNumber
    if (/[加减]/.exec(str)) {
      let tmp = str.replace(/加/g, ",+,")
      tmp = tmp.replace(/减/g, ",-,")
      let res = ''
      tmp.split(',').map(function (x) {
        if (['+', '-'].indexOf(x) == -1) {
          res = res + toMath(x)
        } else {
          res = res + x
        }
      })
      return res
    } else if (/[乘除]/.exec(str)) {
      let tmp
      tmp = str.replace(/乘以/g, ",*,")
      tmp = tmp.replace(/乘/g, ",*,")
      tmp = tmp.replace(/除以/g, ",/,")
      let res = ''
      tmp.split(',').map(function (x) {
        if (['*', '/'].indexOf(x) == -1) {
          res = res + toMath(x)
        } else {
          res = res + x
        }
      })
      return res
    } else if (/分之/.exec(str)) {
      let tmp = str.replace(/分之/g, ",/,")
      // console.log(111, tmp)
      let res = ''
      //         tmp.reverse()
      tmp.split(',').reverse().map(function (x) {
        if (['/'].indexOf(x) == -1) {
          res = res + toMath(x)
        } else {
          res = res + x
        }
      })
      return "(" + res + ")"
    } else if (/的.*次方$/.exec(str)) {
      let tmp = str.slice(0, /次方$/.exec(str).index)
      let res = /.*的/.exec(tmp)
      let A = res[0].substr(0, res[0].length - 1)
      let B = res.input.replace(res[0], "")
      return "(" + toMath(A) + ")" + "^" + "(" + toMath(B) + ")"
    } else if (/的平方$/.exec(str)) {
      let tmp = str.slice(0, /的平方$/.exec(str).index)
      return "(" + toMath(tmp) + ")" + "^" + (2)
    } else if (/的立方$/.exec(str)) {
      let tmp = str.slice(0, /的立方$/.exec(str).index)
      return "(" + toMath(tmp) + ")" + "^" + (3)
    } else if (/^第.*个$/.exec(str)) {
      let tmp = str.slice(1, str.length - 1)
      // console.log('第', tmp, '个')
      let index = ChineseToNumber(tmp) - 1
      if (that.data.dialogList.slice(0)[index]) {
        return "(" + that.data.dialogList.slice(0)[index].translateText.split('=')[0] + ")"
      } else{
        return '不存在这条记录'
      }
    } else {
      // console.log('last',str,str.replace(/[^0-9一二三四五六七八九零十百千亿]/g, ""))
      return ChineseToNumber(str.replace(/[^0-9一二三四五六七八九零十百千亿]/g, ""))
    }
  },
  zhToNumber(str) {
    var chnNumChar = {
      零: 0,
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      七: 7,
      八: 8,
      九: 9
    };

    var chnNameValue = {
      十: {
        value: 10,
        secUnit: false
      },
      百: {
        value: 100,
        secUnit: false
      },
      千: {
        value: 1000,
        secUnit: false
      },
      万: {
        value: 10000,
        secUnit: true
      },
      亿: {
        value: 100000000,
        secUnit: true
      }
    }

    function ChineseToNumber(chnStr) {
      var rtn = 0;
      var section = 0;
      var number = 0;
      var secUnit = false;
      var str = chnStr.split('');

      for (var i = 0; i < str.length; i++) {
        var num = chnNumChar[str[i]];
        if (typeof num !== 'undefined') {
          number = num;
          if (i === str.length - 1) {
            section += number;
          }
        } else {
          if (typeof chnNameValue[str[i]] !== 'undefined') {
            var unit = chnNameValue[str[i]].value;
            secUnit = chnNameValue[str[i]].secUnit;
            if (secUnit) {
              section = (section + number) * unit;
              rtn += section;
              section = 0;
            } else {
              section += (number * unit);
            }
            number = 0;
          } else {
            return '对不起我没有听懂'
          }

        }
      }
      return rtn + section;
    }
    var pattern3 = new RegExp("[0-9]+");
    // console.log('str',str)
    if (pattern3.test(str)) {
      return str
    } else {
      // console.log(ChineseToNumber(str))
      return ChineseToNumber(str)
    }
  },
  translateText: function (item, index) {
    let that = this
    console.log(item, index)
    plugin.textToSpeech({
      lang: 'zh_CN',
      content: that.caculate(item.text),
      success: resTrans => {
        if (resTrans.retcode == 0) {
          let tmpDialogList = this.data.dialogList.slice(0)
          let tmpTranslate = Object.assign({}, item, {
            autoPlay: true, // 自动播放背景音乐
            translateText: that.caculate(item.text),
            translateVoicePath: resTrans.filename,
            translateVoiceExpiredTime: resTrans.expired_time || 0
          })
          tmpDialogList[index] = tmpTranslate
          this.setData({
            dialogList: tmpDialogList,
            bottomButtonDisabled: false,
            recording: false,
          })

          this.scrollToNew();

        } else {
          console.warn("语音合成失败", resTrans, item)
        }
      },
      fail: function (resTrans) {
        console.warn("语音合成失败", resTrans, item)
      }
    })
    // let tmpTranslate = Object.assign({}, item, {
    //   autoPlay: true, // 自动播放背景音乐
    //   translateText: item.text,
    //   translateVoicePath: "",
    //   translateVoiceExpiredTime: 0
    // })

    // tmpDialogList[index] = tmpTranslate
    // this.setData({
    //   dialogList: tmpDialogList,
    //   bottomButtonDisabled: false,
    //   recording: false,
    // })

    // this.scrollToNew();
    return
    let lfrom = item.lfrom || 'zh_CN'
    let lto = item.lto || 'en_US'
    plugin.translate({
      lfrom: lfrom,
      lto: lto,
      content: item.text,
      tts: true,
      success: (resTrans) => {
        let passRetcode = [
          0, // 翻译合成成功
          -10006, // 翻译成功，合成失败
          -10007, // 翻译成功，传入了不支持的语音合成语言
          -10008, // 翻译成功，语音合成达到频率限制
        ]

        if (passRetcode.indexOf(resTrans.retcode) >= 0) {
          let tmpDialogList = this.data.dialogList.slice(0)
          if (!isNaN(index)) {
            let tmpTranslate = Object.assign({}, item, {
              autoPlay: true, // 自动播放背景音乐
              translateText: resTrans.result,
              translateVoicePath: resTrans.filename || "",
              translateVoiceExpiredTime: resTrans.expired_time || 0
            })

            tmpDialogList[index] = tmpTranslate
            this.setData({
              dialogList: tmpDialogList,
              bottomButtonDisabled: false,
              recording: false,
            })

            this.scrollToNew();

          } else {
            console.error("index error", resTrans, item)
          }
        } else {
          console.warn("翻译失败", resTrans, item)
        }

      },
      fail: function (resTrans) {
        console.error("调用失败", resTrans, item)
        this.setData({
          bottomButtonDisabled: false,
          recording: false,
        })
      },
      complete: resTrans => {
        this.setData({
          recordStatus: 1,
        })
        wx.hideLoading()
      }
    })

  },


  /**
   * 修改文本信息之后触发翻译操作
   */
  translateTextAction: function (e) {
    // console.log("translateTextAction" ,e)
    let detail = e.detail // 自定义组件触发事件时提供的detail对象
    let item = detail.item
    let index = detail.index

    this.translateText(item, index)



  },

  /**
   * 语音文件过期，重新合成语音文件
   */
  expiredAction: function (e) {
    let detail = e.detail || {} // 自定义组件触发事件时提供的detail对象
    let item = detail.item || {}
    let index = detail.index

    if (isNaN(index) || index < 0) {
      return
    }

    let lto = item.lto || 'en_US'

    plugin.textToSpeech({
      lang: lto,
      content: item.translateText,
      success: resTrans => {
        if (resTrans.retcode == 0) {
          let tmpDialogList = this.data.dialogList.slice(0)

          let tmpTranslate = Object.assign({}, item, {
            autoPlay: true, // 自动播放背景音乐
            translateVoicePath: resTrans.filename,
            translateVoiceExpiredTime: resTrans.expired_time || 0
          })

          tmpDialogList[index] = tmpTranslate


          this.setData({
            dialogList: tmpDialogList,
          })

        } else {
          console.warn("语音合成失败", resTrans, item)
        }
      },
      fail: function (resTrans) {
        console.warn("语音合成失败", resTrans, item)
      }
    })
  },

  /**
   * 初始化为空时的卡片
   */
  initCard: function () {
    let initTranslateNew = Object.assign({}, this.data.initTranslate, {
      create: util.recordTime(new Date()),
    })
    this.setData({
      initTranslate: initTranslateNew
    })
  },


  /**
   * 删除卡片
   */
  deleteItem: function (e) {
    // console.log("deleteItem" ,e)
    let detail = e.detail
    let item = detail.item

    let tmpDialogList = this.data.dialogList.slice(0)
    let arrIndex = detail.index
    tmpDialogList.splice(arrIndex, 1)

    // 不使用setTImeout可能会触发 Error: Expect END descriptor with depth 0 but get another
    setTimeout(() => {
      this.setData({
        dialogList: tmpDialogList
      })
      if (tmpDialogList.length == 0) {
        this.initCard()
      }
    }, 0)

  },


  /**
   * 识别内容为空时的反馈
   */
  showRecordEmptyTip: function () {
    this.setData({
      recording: false,
      bottomButtonDisabled: false,
    })
    wx.showToast({
      title: this.data.tips_language.recognize_nothing,
      icon: 'success',
      image: '/image/no_voice.png',
      duration: 1000,
      success: function (res) {

      },
      fail: function (res) {
        console.log(res);
      }
    });
  },


  /**
   * 初始化语音识别回调
   * 绑定语音播放开始事件
   */
  initRecord: function () {
    //有新的识别内容返回，则会调用此事件
    manager.onRecognize = (res) => {
      let currentData = Object.assign({}, this.data.currentTranslate, {
        text: res.result,
      })
      this.setData({
        currentTranslate: currentData,
      })
      this.scrollToNew();
    }

    // 识别结束事件
    manager.onStop = (res) => {

      let text = res.result

      if (text == '') {
        this.showRecordEmptyTip()
        return
      }

      let lastId = this.data.lastId + 1

      let currentData = Object.assign({}, this.data.currentTranslate, {
        text: res.result,
        translateText: '正在翻译中',
        id: lastId,
        voicePath: res.tempFilePath
      })

      this.setData({
        currentTranslate: currentData,
        recordStatus: 1,
        lastId: lastId,
      })

      this.scrollToNew();

      this.translateText(currentData, this.data.dialogList.length)
    }

    // 识别错误事件
    manager.onError = (res) => {

      this.setData({
        recording: false,
        bottomButtonDisabled: false,
      })

    }

    // 语音播放开始事件
    wx.onBackgroundAudioPlay(res => {

      const backgroundAudioManager = wx.getBackgroundAudioManager()
      let src = backgroundAudioManager.src

      this.setData({
        currentTranslateVoice: src
      })

    })
  },

  /**
   * 设置语音识别历史记录
   */
  setHistory: function () {
    try {
      let dialogList = this.data.dialogList
      dialogList.forEach(item => {
        item.autoPlay = false
      })
      wx.setStorageSync('history', dialogList)

    } catch (e) {

      console.error("setStorageSync setHistory failed")
    }
  },

  /**
   * 得到历史记录
   */
  getHistory: function () {
    try {
      let history = wx.getStorageSync('history')
      if (history) {
        let len = history.length;
        let lastId = this.data.lastId
        if (len > 0) {
          lastId = history[len - 1].id || -1;
        }
        this.setData({
          dialogList: history,
          toView: this.data.toView,
          lastId: lastId,
        })
      }

    } catch (e) {
      // Do something when catch error
      this.setData({
        dialogList: []
      })
    }
  },

  /**
   * 重新滚动到底部
   */
  scrollToNew: function () {
    this.setData({
      toView: this.data.toView
    })
  },

  onShow: function () {
    this.scrollToNew();

    this.initCard()

    if (this.data.recordStatus == 2) {
      wx.showLoading({
        // title: '',
        mask: true,
      })
    }

  },

  onLoad: function () {

    // console.log('eval',evaluate('Math.pow(4,1/2)'))
    let that = this
    let sysinfo = wx.getSystemInfoSync()
    let rtbuttonInfo = wx.getMenuButtonBoundingClientRect()
    that.setData({
      sysinfo,
      rtbuttonInfo,
    })
    this.getHistory()
    this.initRecord()


    this.setData({
      toView: this.data.toView
    })


    app.getRecordAuth()
  },

  onHide: function () {
    this.setHistory()
  },
})