class ChromeClickAction{constructor(o,a){if(a){this.a=a};Object.keys(o).map(k=>this.add(k,o[k]));return this};add(k,f){Object.defineProperty(this,k,{get:function(){f();if(this.a){this.display()}}});return this};display(){console.info(this);return this}}
class ChromeExecutionPrompt extends ChromeClickAction {constructor(p,c,a){super({continue:c,abort:a},0);this.prompt=p;return this}}

// a = new ChromeClickAction({execute_me:function(){console.log("hey there")}},1).display();
// new Promise(function(res,rej){currentError=new ChromeExecutionPrompt("encountered an Error!",res,rej).display()}).then(function(){console.log("resolved Issue, continue execution")}).catch(function(){console.log("can not resolve issue, skiping execution")})
_G_cca = [];