import plugin from '../../lib/plugins/plugin.js'
import puppeteer from "../../lib/puppeteer/puppeteer.js";

var mines = {} // 标记雷：{1-1：true}
var isopen = {} // 标记翻开：{1-1：true}
var archive = {} // 标记值：{1-1：1}
var game = false // 游戏是否正在运行
var z = 10 // 雷数量
var rows = 10 // 横
var cols = 10 // 竖
var mun = [] // 左上角显示雷数量
var data_map1 = [] // 添加数字后的地图数据
var mark = {} // 标记样式
const c = 760 // 总宽度760px多一点点
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' // 显示的字母

var prefix = '' //设置指令前缀



export class newcomer extends plugin {
  constructor() {
    super({
      name: '扫雷',
      dsc: '扫雷小游戏',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: 5000,
      rule: [
        {
          /** 命令正则匹配 */
          reg: `^(${prefix})?扫雷$`,
          /** 执行方法 */
          fnc: 'goo'
        },
        {
          /** 命令正则匹配 */
          reg: `^(${prefix})?扫雷难度(:|：)?.+$`,
          /** 执行方法 */
          fnc: 'goolevel'
        },
        {
          /** 命令正则匹配 */
          reg: `^(${prefix})?结束扫雷$`,
          /** 执行方法 */
          fnc: 'ov'
        },
        {
          /** 命令正则匹配 */
          reg: `^(${prefix})?翻开([a-zA-Z]{1}[0-9]+){1,}$`,
          /** 执行方法 */
          fnc: 'gooplye'
        },
        {
          /** 命令正则匹配 */
          reg: `^(${prefix})?标记([a-zA-Z]{1}[0-9]+){1,}$`,
          /** 执行方法 */
          fnc: 'mark'
        },
        {
          /** 命令正则匹配 */
          reg: `^(${prefix})?取消标记([a-zA-Z]{1}[0-9]+){1,}$`,
          /** 执行方法 */
          fnc: 'removemark'
        },
        {
          /** 命令正则匹配 */
          reg: `^扫雷设置指令前缀.*$`,
          /** 执行方法 */
          fnc: 'SetupPrefix'
        },
      ]
    })
  }

  async goo(e) {
    goo(e)
  }

  /**
   * 设置难度
   */
  async goolevel(e) {
    if (game) return e.reply(`游戏已开始，发送“${prefix}扫雷”查看当前状态`);
    let emsg = e.msg.replace(new RegExp(`^(${prefix})?扫雷难度(:|：)?`),'')

    switch (emsg) {
      case '简单':
        z = 10
        rows = 9
        cols = 9
        break;
      case '困难':
        z = 60
        rows = 25
        cols = 25
        break;
      case '中等':
        z = 40
        rows = 16
        cols = 16
        break;
      default:
        break;
    }
    goo(e)
  }

  async SetupPrefix(e) {
    prefix = e.msg.replace(/^扫雷设置指令前缀 ?/,'')
    e.reply(`已添加前缀"${prefix}"\n移除请发送“扫雷设置指令前缀”`)

  }

  async ov(e) {
    e.reply('已结束扫雷游戏')
    over()
  }

  /**
   * 取消标记
   */
  async removemark(e) {
    if (!game) return false;

    e.msg.match(/([a-zA-Z])(\d+)/g).forEach(v => {
      // 获取坐标
      // emsg[1]为字母，emsg[2]为数字
      let emsg = v.match(/([a-zA-Z])(\d+)/)
      let letter = emsg[1].toUpperCase() // 大写字母
      letter = letter.charCodeAt(0) - 65 // 转数字 A = 0

      let axis = `${letter}-${emsg[2]}`
      console.log('获取坐标' + axis);

      // 判断坐标是否存在
      if (archive[axis]) {
        // 判断坐标是否显示
        if(!isopen[axis]){
          mark[axis] = false
        }
      }

    })
    generate(e)
    
  }

  /**
   * 标记
   */
  async mark(e) {
    if (!game) return false;

    e.msg.match(/([a-zA-Z])(\d+)/g).forEach(v => {
      // 获取坐标
      // emsg[1]为字母，emsg[2]为数字
      let emsg = v.match(/([a-zA-Z])(\d+)/)
      let letter = emsg[1].toUpperCase() // 大写字母
      letter = letter.charCodeAt(0) - 65 // 转数字 A = 0

      let axis = `${letter}-${emsg[2]}`
      console.log('当前坐标' + axis);

      // 判断坐标是否存在
      if (archive[axis]) {
        // 判断坐标是否显示
        if(!isopen[axis]){
          mark[axis] = true
        }
      }

    })
    generate(e)
    
  }

  /**
   * 游戏指令
   */
  async gooplye(e) {
    if(!game)return false;

    /**
     * 玩家点击 A1 获得坐标 01
     * 判断 ‘标记雷’ 点击的是否为雷 -> 结束游戏
     * 判断 ‘标记翻开’ 得到剩余数量与雷数量是否一致，一致则胜利 -> 结束游戏
     * 判断 ‘添加数字后的地图数据’ 是否为‘-’，扩散显示，遇到数字停下
     */

    let gameover = false


    // 获取坐标
    // emsg[1]为字母，emsg[2]为数字
    e.msg.match(/([a-zA-Z])(\d+)/g).forEach(v => {
      let emsg = v.match(/([a-zA-Z])(\d+)/)
      let letter = emsg[1].toUpperCase() // 大写字母
      letter = letter.charCodeAt(0) - 65 // 转数字 A = 0

      let axis = `${letter}-${emsg[2]}`
      console.log('获取坐标' + axis);

      // 判断坐标是否存在
      if (archive[axis]) {
        // 判断雷
        if (mines[axis]) {
          e.reply('踩雷，游戏结束')
          archive[axis] = 'x'
          isopen[axis] = true
          gameover = true
          return
        }

        // 判断胜利
        if(rows*cols - Object.values(isopen).filter(v => v).length - 1 === z){
          e.reply('恭喜您成功了')
          isopen[axis] = true
          gameover = true
          return
        }

        // 扩散显示
        // 当前位置
        let indexs = axis.split('-')

        if(archive[axis] === '0'){
          const loop = (indexs) => {
            [
              [+indexs[0] - 1, +indexs[1] - 1],
              [+indexs[0] - 1, +indexs[1]],
              [+indexs[0] - 1, +indexs[1] + 1],
              [+indexs[0], +indexs[1] - 1],
              [+indexs[0], +indexs[1] + 1],
              [+indexs[0] + 1, +indexs[1] - 1],
              [+indexs[0] + 1, +indexs[1]],
              [+indexs[0] + 1, +indexs[1] + 1]
            ].forEach(subIndexs => {
              // console.log('subIndexs:',subIndexs);
              let el = archive[subIndexs.join('-')]
              // console.log('el:',el);
              if (el) {
                let thisel = mark[subIndexs.join('-')]

                // 值为’-‘开始扩散
                if (el === '0' && isopen[subIndexs.join('-')] === false) {
                  if(thisel !== true){ // 没被标记显示
                    isopen[subIndexs.join('-')] = true
                    console.log('回调' + subIndexs);
                    loop(subIndexs)
                  }
                }else{
                  if(thisel !== true){ // 没被标记显示
                    isopen[subIndexs.join('-')] = true
                  }
                }
              }
            })
          }
          loop(indexs)
        }
        // 显示指定坐标块
        isopen[axis] = true
      }
    })
    generate(e)
    if(gameover){
      over()
    }
  }

}

/**
 * 开始游戏
 */

async function goo(e) {
  /**
   * 开始游戏
   * 生成随机地图
   * 生成各类坐标
   * 
   * 输出
   * 标记雷：{1-1：true}
   * 标记翻开：{1-1：true}
   * 标记样式：{1-1：true}
   * 标记值：{1-1：1}
   * 
   * 输出无误设置游戏状态
   * game = true
   */

  if(game){
    e.reply('扫雷游戏已经开始') 
    generate(e)
    return
  };

  var data_map = [] // 雷数据
  

  // 生成x*y个字符，值为'-'，表示未翻开
  var numbers = Array.from({length: rows*cols}, () => '0')

  // 随机替换z个数字为9，表示雷
  let indexes = [];
  while (indexes.length < z) {
    var index = Math.floor(Math.random() * rows * cols);
    if (!indexes.includes(index)) {
      indexes.push(index)
      numbers[index] = 9
    }
  }
  // 遍历numbers，每x个数换一行
  for (var i = 0; i < numbers.length; i += rows) {
  data_map.push(numbers.slice(i, i+rows))
  }


  /**
   * 添加坐标，标记雷
   * 设置玩家看到的样式，是否翻开
   * 设置标记
   * 设置显示的坐标
   */
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      // 标记雷
      if(data_map[i][j] == 9){
        mines[i + '-' + j] = true
      }else{
        mines[i + '-' + j] = false
      }

      // 设置样式是否翻开
      isopen[i + '-' + j] = false

      // 设置标记
      mark[i + '-' + j] = false

      // 设置显示的坐标
      mun.push(ABC[i] + j)
      
    }
  }
  // 实际雷数量
  console.log(Object.values(mines).filter(v => v).length)

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const isMines = mines[i + '-' + j]
      const number = Object.values({
        0: mines[`${i - 1}-${j - 1}`],
        1: mines[`${i - 1}-${j}`],
        2: mines[`${i - 1}-${j + 1}`],
        3: mines[`${i}-${j - 1}`],
        4: mines[`${i}-${j + 1}`],
        5: mines[`${i + 1}-${j - 1}`],
        6: mines[`${i + 1}-${j}`],
        7: mines[`${i + 1}-${j + 1}`],
      }).filter(v => v).length
      if(isMines){
        archive[i + '-' + j] = 9
        data_map1.push(9)
      }else{
        archive[i + '-' + j] = number ? number : '0'
        data_map1.push(number ? number : '-')
      }
    }
  }
  // 上帝地图
  console.log(archive);
  mun = String(mun)
  generate(e)
  game = true
}

/**
 * 重置游戏
 */
async function over(){
  mines = {} // 标记雷：{1-1：true}
  isopen = {} // 标记翻开：{1-1：true}
  archive = {} // 标记值：{1-1：1}
  game = false // 游戏是否正在运行
  mun = [] // 左上角显示雷数量
  data_map1 = [] // 添加数字后的地图数据
}


/**
 * 发送图片
 */
async function generate(e){
  // console.log('地图' + data_map1)
  // console.log('雷' + mun)
  // console.log('值' , archive)
  // console.log('标记' ,isopen)


  /**
     * 0：翻开空
     * 1-8：雷数量
     * 9：雷
     * -：未翻开
     * +：标记
     * x：踩中的雷
    */


  let data_map = []
  let val = Object.values(archive)
  // console.log(val)
  let a = +z

  let mark1 = Object.values(mark)

  // 遍历翻开
  Object.values(isopen).forEach((el,index) => {
    if(el){
      data_map.push(val[index])
    }else if(mark1[index]){
      a = a-1
      data_map.push('+')
    }else{
      data_map.push('-')
    }
  })

  // 创建地图数组
  let map = String(data_map)


  let data = {
    tplFile:'./resources/html/demo.html',
    map:map,
    headurl:'http://q1.qlogo.cn/g?b=qq&s=100&nk=' + e.user_id,
    l:a,
    x:rows,
    c:c,
    muns:mun
  }
  let img = await puppeteer.screenshot("33", {
    ...data,
  })
  e.reply(img)
}