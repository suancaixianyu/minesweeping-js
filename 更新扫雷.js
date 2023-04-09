import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs'
import fetch from "node-fetch";
import e from 'express';


/**
 * 更新js
 */
async function update(e){
  let url = 'http://suancaixianyu.cn/file/saolei.js'
  let response = await fetch(url);
  let obj = await response.text();
  fs.writeFile(`${process.cwd()}/plugins/example/扫雷.js`, obj, function (err) {
    if (err) {
      console.error('文件写入失败，可以尝试重启一次',err);
    }else{
      console.log(`写入地址：${process.cwd()}\\plugins\\example\\扫雷.js\n写入完成`)
      loadtemplate(e)
    }
  })
}

/**
 * 加载模板文件
 */
async function loadtemplate(e){
  let url = 'http://suancaixianyu.cn/file/demo.html';
  let fl = `${process.cwd()}/resources/html`;
  // 创建文件夹
  if (!fs.existsSync(fl)) {
    fs.mkdirSync(fl);
  }
  let response = await fetch(url);
  let obj = await response.text();
  fs.writeFile(`${fl}/demo.html`, obj, function (err) {
    if (err) {
      console.error('文件写入失败，可以尝试重启一次',err);
    }else{
      e.reply('扫雷更新完成')
    }
  })
}

export class newcomer extends plugin {
  constructor() {
    super({
      name: '更新扫雷js',
      dsc: '更新扫雷',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: 4900,
      rule: [
        {
          /** 命令正则匹配 */
          reg: `^更新扫雷$`,
          /** 执行方法 */
          fnc: 'update'
        },
      ]
    })
  }

  async update(e){
    e.reply('开始更新扫雷')
    update(e)
  }
}
