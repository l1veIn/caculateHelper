// Components/guide/guide.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    index:{
      type:Number,
      value:1
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    first:true
  },

  /**
   * 组件的方法列表
   */
  methods: {
    cancel(){
      console.log('cancel')
      let that =this
      that.triggerEvent('finish')
    },
    next(){
      let that = this
      that.setData({
        first:false
      })
    }
  }
})
