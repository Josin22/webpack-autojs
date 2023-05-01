"ui";

const _request = require('./w_request');

const _appConfig = {
  app_version: "1.0",
  path_login: 'https://login.hk865hhh.bby63.com/monitor/member/login.html',
  path_trade: '/monitor/wechat/trade.html',
  is_pause: true,
  is_runing_script: false,
  deviceId: device.getAndroidId(),
  msg_list: [],
  pull_down_count: 0,
  pull_down_max_count: 3,
}
ui.layout(
  <vertical>
    <appbar>
      <toolbar title="微信助手V{{_appConfig.app_version}}" >
        <button id="btn_api_config" text="配置地址" textColor='white' layout_gravity="right" style="Widget.AppCompat.Button.Borderless.Colored"/>
      </toolbar>
    </appbar>
    <vertical padding="10 5 10 5">
    <horizontal marginTop="5">
        <text textSize="15sp" layout_weight="1" textColor="red">设备ID</text>
        <text textSize="15sp" layout_weight="1" text="{{_appConfig.deviceId}}" gravity="right"/>
      </horizontal>
      <horizontal marginTop="5">
        <text textSize="15sp" layout_weight="1" textColor="red">开启无障碍服务</text>
        <Switch id="switch_accessible" checked="{{auto.service != null}}" textSize="15sp"/>
      </horizontal>
      <horizontal id="open">
        <button id="startScriptBtn" marginTop="5"  text="开启脚本"  layout_weight="1" style="Widget.AppCompat.Button.Colored"/>
      </horizontal>
      <vertical id="close">
          <horizontal>
              <text text="账号"/>
              <input id="account" w="*"/>
          </horizontal>
          <horizontal>
              <text text="密码"/>
              <input id="pass" w="*" inputType="textPassword"/>
          </horizontal>
          <button id="startLoginBtn" marginTop="5"  text="登录"  layout_weight="1" style="Widget.AppCompat.Button.Colored"/>
      </vertical>
    </vertical>
  </vertical>
)

function updateLoginStatus(isLogin){
  if(isLogin){
    ui.open.visibility = 0
    ui.close.visibility = 8
  } else {
    ui.open.visibility = 8
    ui.close.visibility = 0
  }
}
var _ui_float
function startWithFloat(){
  _ui_float = floaty.window(
    <frame bg="#7F000000" >
      <vertical>
        <horizontal id="bg_h">
          <Switch id="fswitch_pause_app" text="暂停" textColor="yellow"  textSize="15sp" />
          <Switch id="fswitch_end_app" text="退出" textColor="red"  textSize="15sp" />
        </horizontal>
      </vertical>
    </frame>
  )
  _ui_float.setPosition(device.width/2,_ui_float.getY())
  _ui_float.fswitch_pause_app.on('check', checked => {
    _appConfig.is_pause = checked
    toastLog('任务已'+checked?'暂停':'恢复')
  })
  _ui_float.fswitch_end_app.on('check', () => {
    engines.stopAll()
  })
}

//监听resume
ui.emitter.on('resume', function () {
  ui.switch_accessible.checked = auto.service != null
})

ui.btn_api_config.on('click', () => {
  handleApiConfig()
})

function handleApiConfig(){
  let api = _request.get_trade_api()
  log('api',api)
  rawInput("请配置上传地址", api)
  .then(expr => {
    if(expr!=null&&expr.indexOf('http')!=-1){
      _request.set_trade_api(expr)
      toastLog('地址配置成功!')
    } else {
      toastLog('地址配置有误!')
    }
});
}

ui.switch_accessible.on('check', (checked) => {
  print('switch_accessible:' + checked)
  if (checked && auto.service == null) {
    app.startActivity({
      action: 'android.settings.ACCESSIBILITY_SETTINGS',
    })
  }
  if (!checked && auto.service != null) {
    auto.service.disableSelf()
  }
})

ui.startLoginBtn.on('click', () => {

  let acc = ui.account.text()
  let pass = ui.pass.text()
  if(acc == null || acc == ''){
    toastLog('请输入正确账号!')
    return 
  }
  if(pass == null || pass == ''){
    toastLog('密码格式不正确!')
    return 
  }
  toastLog('正在登录，请稍等~')
  _request.post(_appConfig.path_login, {username: acc, password: pass}, {
    success: (res) => {
      log('login res',res)
      const access_token = res.access_token
      _request.set_access_token(access_token)
      ui.run(() => {
        updateLoginStatus(true)
        toastLog('登录成功~')
      })
    },
    error: (err) => {
      log('err',err)
      toastLog(err)
    }
  })
})

// TODO
// _request.clear_access_token()

updateLoginStatus(_request.get_access_token()!=null)

function isOpenAccessibility() {
  if (auto.service == null) {
    dialogs.confirm(
      '提示',
      '您必须开启无障碍模式才能正常使用此软件',
      function (index) {
        app.startActivity({
          action: 'android.settings.ACCESSIBILITY_SETTINGS',
        })
      }
    )
    return false
  }
  return true
}

ui.startScriptBtn.on('click', () => {
  //check api
  if(_request.get_trade_api() == null){
    toastLog('请先配置上传地址')
    handleApiConfig()
    return
  }
  //check accessibility
  if(_appConfig.is_runing_script){
    _appConfig.is_pause = true;
    _appConfig.is_runing_script = false
    ui.startScriptBtn.setText('开启脚本')
    _ui_float.close()
    threads.shutDownAll()
    return
  }
  // 检查是否开启无障碍
  if (!isOpenAccessibility()) {
    ui.switch_accessible.checked = false
    return
  }

  confirm("请务必检查已将微信里各个银行公众号消息[置顶]~").then(value=>{
    if(value){
      onStart()
    }
});
})

function onStart(){
  _appConfig.is_runing_script = true
  startWithFloat()
  _appConfig.is_pause = false;
  ui.startScriptBtn.setText('关闭脚本')
  startLoop()
}


function upload(content){
  toastLog('上报消息:'+content)
  let api = _request.get_trade_api()
  if(api==null){
    toastLog('请先配置上传地址')
    return
  }
  _request.post(api+_appConfig.path_trade, {content, device:_appConfig.deviceId}, {
    success: (res) => {
      log('trade res',res)
      ui.run(() => {
        toastLog('上报成功~')
      })
    },
    error: (err) => {
      log('err',err)
      toastLog(err)
    }
  })
}

function isHome(){
  let wx = id("com.tencent.mm:id/f1f").findOne(500)
  if(wx!=null){
    let bb = wx.bounds()
    click(bb.centerX(), bb.centerY())
  }
}

function goback(){
  let gb =id("com.tencent.mm:id/g0").findOne(1000)
  if(gb!=null){
    gb.click()
  }
}

function lookupBankList(){
  toastLog('开始轮询银行消息')
  let names =  id("com.tencent.mm:id/hg4").find()
  if(names!=null){
    names.filter(element => element.text().indexOf('银行')!=-1)
        .forEach(element => {
          let bb = element.bounds()
          click(bb.centerX(), bb.centerY())
          toastLog('开始检查:'+element.text())
          _appConfig.pull_down_count = 0
          sleep(1000)
          handleBankDetailMsg()
        }); 
  }
}

function handleBankDetailMsg(){
  if(_appConfig.is_pause){
    return
  }
  let isLimit = checkTimeLimit()
  if(isLimit){
    goback()
    toastLog('仅抓取2天内流水,自动返回')
    sleep(1000)
    return
  }
  let msgs =  id("com.tencent.mm:id/c74").find()
  if(msgs!=null){
    let oldCount = _appConfig.msg_list.length
    msgs.forEach(msg => {
      if(msg.child(0)==null){
        return
      }
      let _msg = msg.child(0).text()
      if(_appConfig.msg_list.indexOf(_msg)==-1){
        _appConfig.msg_list.push(_msg)
        upload(_msg)
      }
    })
    let newCount = _appConfig.msg_list.length
    if(oldCount == newCount){
      if(isOverPullDownMax()){
        _appConfig.pull_down_count = 0
        goback()
        toastLog('未新增流水,自动返回')
        sleep(1000)
        return
      }
      _appConfig.pull_down_count++
    }
    loadMore()
  } else {
    //下滑拉去更多
    if(isOverPullDownMax()){
      _appConfig.pull_down_count = 0
      goback()
      toastLog('未查询到流水,自动返回')
      sleep(1000)
      return  
    }
    _appConfig.pull_down_count++
    loadMore()
  }
}

function checkTimeLimit(){
  // fullId("com.tencent.mm:id/b8z")17:39 昨天 17:39text("周四 17:39")text("4月20日 上午08:08")text("2月10日 晚上18:23")
  let times =  id("com.tencent.mm:id/b8z").find()
  if(times==null)return false
  let isAllOverTime = true
  times.forEach(time => {
      let st = time.text()
      if(st!=null&&(st.startsWith('昨天')||st.length <= 7)){
        isAllOverTime = false
      }
  })
  return isAllOverTime
}

function loadMore(){
  swipe(device.width/2, device.height/2, device.width, device.height/2+555, 500)
  sleep(1000)
  handleBankDetailMsg()
}

function isOverPullDownMax(){
  return _appConfig.pull_down_count>_appConfig.pull_down_max_count
}

function startLoop(){
  launch("com.tencent.mm");

  threads.start(function() {
    while (_appConfig.is_runing_script) {
      let is_pause = _appConfig.is_pause
      log('is_pause',is_pause)
      if(is_pause){
        sleep(1000*3)
        continue
      }
      isHome()
      lookupBankList()
      sleep(3000)
    }
  })
}