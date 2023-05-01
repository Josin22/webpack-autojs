const _mainStorage = storages.create("BNASDUHAUI");

importClass(java.security.KeyFactory)
importClass(java.util.Base64)
importClass(java.security.spec.X509EncodedKeySpec)
importClass(javax.crypto.Cipher)
importClass(javax.crypto.spec.SecretKeySpec)

var aBase64 = android.util.Base64

const publicKeyS = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCyYPN12O5eHQ1HkQFYurC/Jjy8CJH5guCO5hqourWdDYPUT+t6FBevyDq3J5yrMku12pxu3ovSdD8yZ0bhb9xwfpYt1jStaLJDlWaM83rXGIZz/ucL+DuVaVDZNl0vBzO+OWttqt3aOaM5QLBF4sH2Gunbw4EqUnDzUCT1mr9pJQIDAQAB';

const publicKey = function(){
  const npublicKey = new java.lang.String(publicKeyS)
  const data = Base64.getDecoder().decode(npublicKey.getBytes())
  const spc = new X509EncodedKeySpec(data)
  return KeyFactory.getInstance("RSA").generatePublic(spc)
}();

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
function generalAesKey(){
  return generateRandomString(16);
}

function aesEncrypt(data, aesKey){
  try {
    let raw = new java.lang.String(aesKey).getBytes();
    let skeySpec = new SecretKeySpec(raw, "AES");
    // "算法/模式/补码方式"
    let cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
    cipher.init(Cipher.ENCRYPT_MODE, skeySpec);
    let encrypted = cipher.doFinal(new java.lang.String(data).getBytes());
        // 此处使用BASE64做转码功能，同时能起到2次加密的作用。
    return aBase64.encodeToString(encrypted, aBase64.NO_WRAP);
  } catch (error) {
    log('aesEncrypt',error)
    return ''
  }
}

function rsaEncrypt(data){
  try {
    const ndata = new java.lang.String(data)
    let cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding");
    cipher.init(Cipher.ENCRYPT_MODE, publicKey);
    return aBase64.encodeToString(cipher.doFinal(ndata.getBytes()),aBase64.NO_WRAP)
  } catch (error) {
    log('rsaEncrypt', error)
    return ''
  }
}

var request = {}

request.post = function(url,json, callback){
  threads.start(function(){
    let token = request.get_access_token()
    let aesKey = generalAesKey()
    log('aesKey',aesKey)
    let secretKey = rsaEncrypt(aesKey)
    log('secretKey',secretKey)
    let data = aesEncrypt(JSON.stringify(json), aesKey)
    log('data',data)
    log('token',token)
    let resJ = http.postJson(url, { data }, {
      headers: {
        'Secret-Key': secretKey,
        'Access-Token': token
      }, 
    });
    try {
      let res = resJ.body.string()
      log('base res:'+res)
      res = JSON.parse(res)
      if(res&&res.code === 0){
        callback.success(res.data)
      } else {
        callback.error(res.msg)
      }
    } catch (error) {
      log(error)
      callback.error(error)
    }
  })
  
}

request.set_access_token = function(tk) {
  return _mainStorage.put("access_token", tk)
}
request.get_access_token = function() {
  return _mainStorage.get("access_token")
}
request.clear_access_token = function() {
  _mainStorage.remove("access_token")
}

request.get_trade_api = function() {
  return _mainStorage.get("trade_api")
}
request.set_trade_api = function(ap) {
  _mainStorage.put("trade_api", ap)
}

module.exports = request