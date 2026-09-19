// ==UserScript==
// @name         新番收藏夹 (内置全站简繁切换版)
// @namespace    yuc-fav
// @version      2.0
// @match        *://yuc.wiki/*
// @connect      i0.hdslb.com
// @connect      *
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
    // 屏蔽网站自身的无用刷屏日志
    const origLog = console.log;
    console.log = function(...args) {
        if (typeof args[0] === 'string' && args[0].includes('未找到 ace 对象')) return;
        origLog.apply(console, args);
    };

    const m = location.pathname.match(/\/(\d{4})(\d{2})/);
    const month = m ? m[1] + '年' + Number(m[2]) + '月新番' : '其他';
    const ym = m ? Number(m[1] + m[2]) : 0;

    const load = () => GM_getValue('favs', {});
    const save = d => GM_setValue('favs', d);
    const clean = s => s.replace(/\s+/g, ' ').trim();
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    const style = document.createElement('style');
    // 新增了 .yf-lang-toggle 等语言切换按钮的样式 (谷歌翻译浅蓝色风格)
    style.textContent = `
        .yf-tab{position:fixed;right:20px;width:96px;padding:6px 0;text-align:center;font-size:12px;background:#333;color:#eee;cursor:pointer;z-index:99999;border-radius:6px;user-select:none;touch-action:none}
        .yf-panel{position:fixed;width:340px;min-width:260px;max-width:95vw;min-height:120px;max-height:90vh;resize:both;overflow:auto;background:#2b2b2b;color:#eee;font:13px sans-serif;border:1px solid #555;z-index:99999;display:none}
        .yf-head{position:sticky;top:0;z-index:1;padding:4px 8px;font-size:12px;color:#aaa;background:#222;cursor:move;user-select:none;touch-action:none}
        .yf-close{position:absolute;right:8px;top:2px;font-size:16px;cursor:pointer;color:#aaa;line-height:1;padding:0 6px;border-radius:4px}
        .yf-close:hover{color:#fff;background:#d32f2f}
        
        .yf-lang-toggle{position:absolute;right:36px;top:3px;display:flex;background:#333;border:1px solid #444;border-radius:4px;overflow:hidden;}
        .yf-lang-btn{padding:2px 8px;font-size:12px;cursor:pointer;color:#aaa;line-height:1.2;transition:all 0.15s;}
        .yf-lang-btn:hover:not(.active){color:#fff;background:#444;}
        .yf-lang-btn.active{background:#e8f0fe;color:#1a73e8;font-weight:bold;}
        
        .yf-panel summary{cursor:pointer;padding:6px 8px;background:#3a3a3a}
        .yf-item{display:flex;gap:8px;padding:6px 8px;border-top:1px solid #444;align-items:flex-start}
        .yf-item img{width:calc(45px * var(--yf-s, 1));height:calc(56px * var(--yf-s, 1));object-fit:cover;flex:none;background:#444;border-radius:3px}
        .yf-info{flex:1;overflow:hidden}
        .yf-cn{font-weight:bold}
        .yf-jp,.yf-tag{color:#aaa;font-size:12px}
        .yf-day-inline{color:#ff5252;font-weight:bold;margin-right:4px}
        .yf-del{cursor:pointer;color:#c66;padding:0 4px}
        .yf-star{position:absolute;z-index:10;right:4px;top:2px;font-size:24px;line-height:1;cursor:pointer;color:#f5a623;user-select:none}
    `;
    document.head.appendChild(style);

    const tab = document.createElement('div');
    tab.className = 'yf-tab';
    tab.innerHTML = '我想看的新番 <span></span>';
    const count = tab.querySelector('span');
    const panel = document.createElement('div');
    panel.className = 'yf-panel';
    document.body.appendChild(tab);
    document.body.appendChild(panel);

    const head = document.createElement('div');
    head.className = 'yf-head';
    // 加入了繁简切换按钮（放在 x 左侧，保持适当间距）
    head.innerHTML = `按住这里拖动，右下角拉伸
        <div class="yf-lang-toggle">
            <span class="yf-lang-btn yf-lang-cn" data-lang="cn">简</span>
            <span class="yf-lang-btn yf-lang-tw" data-lang="tw">繁</span>
        </div>
        <span class="yf-close" title="关闭面板">×</span>`;
    const content = document.createElement('div');
    panel.appendChild(head);
    panel.appendChild(content);

    // ======== 简繁转换核心逻辑 ========
    // 基础高频汉字 1:1 映射字典 (保证性能与准确性)
    const sChars = "万与丑专业丛东丝丢两严丧个丬丰临为丽举么义乌乐乔习乡书买乱争于亏云亘亚产亩亲亵亸亿仅从仑仓仪们价众优伙会伛伞伟传伤伥伦伧伪伫体余佣佥侠侣侥侦侧侨侩侪侬俣俦俨俩俪俭债倾偬偻偾偿傥傧储傩儿兑兖党兰关兴兹养兽冁内冈册写军农冢冯冲决况冻净凄凉减凑凛几凤凫凭凯击凿刍划刘则刚创删别刬刭刽刿剀剂剐剑剥剧劝办务劢动励劲劳势勋匀匦匮区医华协单卖卢卤卧卫却卺厂厅历厉压厌厍厕厢厣厦厨厩厮县参叆叇双发变叙叠叶号叹叽吁后吓吕吗吨听启吴呒呓呕呖呗员呙呛呜咏咙咛咝咸响哑哒哓哔哕哗哙哜哝哟唛唝唠唡唢唤啧啬啭啮啰啴啸喷喽喾嗫嗳嘘嘤嘱噜嚣团园囱围囵国图圆圣圹场坏块坚坛坜坝坞坟坠垄垆垒垦垩垫垭垲埘埙埚堑堕塆墙壮声壳壶处备复够头夸夹夺奁奂奋奖奥妆妇妈妩妪妫姗娄娅娆娇娈娱娲娴婴婵婶媪袅孙学孪宁宝实宠审宪宫宽宾寝对寻导寿将尔尘尝尧尴尽层屃屉届属屡屦屿岁岂岖岗岘岙岚岛岭岳岽岿峃峄峡峣峤峥峦崂崃崄崭嵘嵚嵝巅巩巯币帅师帏帐帘帜带帧帮帱帻帼幂广庆庐庑库应庙庞废廒迟建异弃弑张弥弪弯弹强归当录彦彻径徕忆忏忧忾怀态怂憮怄怅怆怜总怼怿恋恳恶恸恹恺恻恼恽悦悫悬悭悯惊惧惨惩惫惬惭惮惯愠愤愦愿慑慭懑懒懔戆戋戏戗战戬户扎扑执扩扪扫扬扰抚抛抟抠抡抢护报担拟拢拣拥拦拧拨择挂挚挛挜挝挞挟挠挡挢挣挤挥撄捞损捡换捣据捻掳掴掷掸掺掼揽揿搀搁搂搅携摄摅摆摇摈摊撄撑撵撷撸撺擞攒敌敛数斋斓斩断无旧时旷旸昙昼昽显晋晒晓晔晕晖晚暧暂术朴机杀杂权条来杨杩杰极构枞枢枣枥枧枨枪枫枭柜柠柽栀栅标栈栉栊栋栌栎栏树栖样栾桠桡桢档桤桥桦桧桨桩梦梼梾检棂椁椟椠椤椭楼榄榇榈榉槚槛槟槠横樯樱橥橱橹橼檩欢欤欧歼殁殇残殒殓殚殡殴毁毂毕毙毡毵氇气氢氩氲汇汉汤汹沟没沣沤沥沦沧沨沩沪沵泞泪泶泷泸泺泻泼泽泾洁洒洼浃浅浆浇浈浉浊测浍济浏浐浑浒浓浔涛涝涞涟涠涡涢涣涤润涧涨涩淀渊渌渍渎渐渑渔渖渗温游湾湿溃溅溆溇滗滚滞滟滠满滢滤滥滦滨滩滪潆潇潋潍潜潴澜濑濒灏灭灯灵灾灿炀炉炖炜炝点炼炽烁烂烃烛烟烦烧烨烩烫烬热焕焖焘爱爷牍牦牵牺犊强状犷犸犹狈狍狝狞独狭狮狯狰狱狲猃猎猕猡猪猫猬献獭玑玙玚玛玮环现玱玺珐珑珲琏琐琼瑶瑷璎瓒瓮瓯电画畅畴疖疗疟疠疡疬疮疯疱疴痖痉痒痦痨痪痫痴瘅瘆瘗瘘瘪瘫瘾瘿癞癣癫皑皱皲盏盐监盖盗盘眍眦眬着睁睐睑瞒瞩矫矶矾矿砀码砖砗砚砜砺砻砾础硷硅硕硖硗硙硚确碍碎碰碱碑碾磁磅磊磋磐磔磕磙磲礅礓礤礧礴礼祢祯祷祸禀禄禅离秃秆种积称秽稣稳穑穷窃窍窑窜窝窥窦窭竖竞笃笋笔笕笺笼笾筑筚筛筝筹签简箓箦箧箨箩箪箫篑篓篮篱簖籁籴类籼粜粝粤粪粮糁糇紧絷纠纡红纣纤纥约级纨纩纪纫纬纭纯纰纱纲纳纴纵纶纷纸纹纺纻纼纽纾线绀绁绂练组绅细织终绉绊绋绌绍绎经绐绑绒结绔绕绖绗绘给绚绛络绝绞统绠绡绢绣绤绥绦继绨绩绪绫绬续绮绯绰绱绲绳维绵绶绷绸绹绺绻综绽绾绿缀缁缂缃缄缅缆缇缈缉缊缋缌缍缎缏缐缑缒缓缔缕编缗缘缙缚缛缜缝缞缟缠缡缢缣缤缥缦缧缨缩缪缫缬缭缮缯缰缱缲缳缴缵罂网罗罚罢罴羁羟羡翘翙翚耢耧耸耻聂聋职聍联聩聪肃肠肤肷肾肿胀胁胆胜胧胨胪胫胶脉脍脏脐脑脓脔脚脱脶脸腊腌腘腭腻腼腽腾膑臜舆舣舰舱舻艰艳艹艺节芈芗芜芦苁苇苈苋苌苍苎苏苹茎茏茑茔茕茧荆荐荙荚荛荜荞荟荠荡荣荤荥荦荧荨荩荪荫荬荭荮药莅莱莲莳莴莶获莸莹莺莼萚萝萤营萦萧萨葱蒇蒉蒋蒌蓝蓟蓠蓣蓥蓦蔷蔹蔺蔼蕲蕴薮藓虏虑虚虫虬虮虽虾虿蚀蚁蚂蚕蚝蚬蛊蛎蛏蛮蛰蛱蛲蛳蛴蜕蜗蜡蝇蝈蝉蝎蝼蝾螀螨蟏衅衔补衬衮袄袅袆袜袭袯装裆裢裣裤裥褛褴见观觃规觅视觇览觉觊觋觌觍觎觏觐觑觞触觯誉誊计订讣认讥讦讧讨让讪讫训议讯记讱讲讳讴讵讶讷许讹论讻讼讽设访诀证诂诃评诅识诇诈诉诊诋诌词诎诏诐译诒诓诔试诖诗诘诙诚诛诜话诞诟诠诡询诣诤该详诧诨诩诪诫诬语诮误诰诱诲诳说诵诶请诸诹诺读诼诽课诿谀谁岑调谄谅谆谇谈谊谋谌谍谎谏谐谑谒谓谔谕谖谗咨谙谚谛谜谝谞谟谠谡谢谣谤谥谦谧谨谩谪谫谬谭谮谯谰谱谲谳谴谵谶谷豮贝贞负贠贡财责贤败账货质贩贪贫贬购贮贯贰贱贲贳贴贵贶贷贸费贺贻贼贽贾贿赀赁赂赃资赅赆赇赈赉赊赋赌赍赎赏赐赑赒赓赔赕赖赗赘赙赚赛赜赝赞赟赠赡赢赣赪赵赶趋趱趸跃跄跖跞践跶跷跸跹跻踊踌踪踬踯蹑蹒蹰蹿躏躜躯车轧轨轩轪轫转轭轮软轰轱轲轳轴轵轶轷轸轹轺轻轼载轾轿辀辁辂较辄辅辆辇辈辉辊辋辌辍辎辏辐辑辒输辔辕辖辗辘辙辚辞辟辩辫边辽达迁过迈运还这进远违连迟迩迳迹适选逊递逦逻遗遥邓邝邬邮邹邺邻郁郄郏郐郑郓郦郧郸酝酦酱酽酾酿释里鉅鉴銮錾钆钇针钉钊钋钌钍钎钏钐钑钒钓钔钕钖钗钘钙钚钛巨钝钞钟钠钡钢钣钤钥钦钧钨钩钪钫钬钭钮钯钰钱钲钳钴钵钶钷钸钹钺钻钼钽钾钿铀铁铂铃铄铅铆铈铉铊铋铍铎铏铐铑铒铕铗铘铙铚铛铜铝铞铟铠铡铢铣铤铥铦铧铨铪铫铬铭铮铯铰铱铲铳铴铵银铷铸铹铺铻铼铽链铿销锁锂锃锄锅锆锇锈锉锊锋锌锎锏锐锑锒锓锔锕锖锗错锚锛锜锝锞锟锠锡锢锣锤锥锦锧锨锩锪锫锬锭键锯锰锱锲锳锴锵锶锷锸锹钟锻锼锾锿镀镁镂镃镄镅镆镇镈镉镊镋镌镍镎镏镐镑镒镓镔镕镖镗镘镙镚镛镜镝镞镟镠镡镢镣镤镥镦镧镨镩镪镫镬镭镮镯镰镱镲镳镴镶长门闩闪闫闬闭问闯闰闱闲闳间闵闶闷闸闹闺闻闼闽闾闿阀阁阂阃阄阅阆阇阈阉阊阋阌阍阎阏阐阑阒阓阔阕阖阗阘阙阚阛队阳阴阵阶际陆陇陈陉陕陧陨险随隐隶隽难雏雠雳雾霁霉霭靓静靥鞑鞒鞯鞴韦韧韨韩韪韫韬韵页顶顷顸项顺须顼顽顾顿颀颁颂颃预颅领颇颈颉颊颋颌颍颎颏颐频颒颓颔颕颖颗题颙颚颛颜额颞颟颠颡颢颣颤颥颦颧风飏飐飑飒飓飔飕飖飗飘飙飚飞飨餍餐饥饦駧饨饩饪饫饬饭饮饯饰饱饲饳饴饵饶饷餄餎饺饻饼饽饾饿馀馁馂馃馄馅馆馇馈馉馊馋馌馍馎馏馐馑馒馓馔馕马驭驮驯驰驱驲驳驴驵驶驷驸驹驺驻驼驽驾驿骀骁骂骃骄骅骆骇骈骉骊骋验骍骎骏骐骑骒骓骔骕骖骗骘骙骚骛骜骝骞骟骠骡骢骣骤骥骦骧骨髅髋髌魔魇鬓闹阋斗闹阋阄郁魉魇鱼鱽鱾鱿鲀鲁鲂鲃鲄鲅鲆鲇鲈鲉鲊鲋鲌鲍鲎鲏鲐鲑鲒鲓鲔鲕鲖鲗鲘鲙鲚鲛鲜鲝鲞鲟鲠鲡鲢鲣鲤鲥鲦鲧鲨鲩鲪鲫鲬鲭鲮鲯鲰鲱鲲鲳鲴鲵鲶鲷鲸鲹鲺鲻鲼鲽鲾鲿鳀鳁鳂鳃鳄鳅鳆鳇鳈鳉鳊鳋鳌鳍鳎鳏鳐鳑鳒鳓鳔鳕鳖鳗鳘鳙鳚鳛鳜鳝鳞鳟鳠鳡鳢鳣鸟鸠鸡鸢鸣鸤鸥鸦鸧鸨鸩鸪鸫鸬鸭鸮鸯鸰鸱鸲鸳鸴鸵鸶鸷鸸鸹鸺鸻鸼鸽鸾鸿鹀鹁鹂鹃鹄鹅鹆鹇鹈鹉鹊鹋鹌鹍鹎鹏鹐鹑鹒鹓鹔鹕鹖鹗鹘鹙鹚鹛骛鹝鹞鹟鹠鹡鹢鹣鹤鹥鹦鹧鹨鹩鹪鹫鹬鹭鹯鹰鹱鹲鹳鹴麦麸黄黉黡黩黪黾鼋鼌鼍鼗鼹齐齑齿龀龁龂龃龄龅龆龇龈龉龊龋龌龙庞龚龛龟汇";
    const tChars = "萬與醜專業叢東絲丟兩嚴喪個爿豐臨為麗舉麼義烏樂喬習鄉書買亂爭於虧雲亙亞產畝親褻嚲億僅從侖倉儀們價眾優夥會傴傘偉傳傷倀倫傖偽佇體餘傭僉俠侶僥偵側僑儈儕儂俁儔儼倆儷儉債傾傯僂僨償儻儐儲儺兒兌兗黨蘭關興茲養獸囅內岡冊寫軍農塚馮衝決況凍淨淒涼減湊凜幾鳳鳧憑凱擊鑿芻劃劉則剛創刪別剗剄劊劌剴劑剮劍剝劇勸辦務勱動勵勁勞勢勳勻匭匱區醫華協單賣盧鹵臥衛卻巹廠廳歷厲壓厭厙廁廂厴廈廚廄廝縣參靆靃雙發變敘疊葉號嘆嘰籲後嚇呂嗎噸聽啟吳嘸囈嘔嚦唄員咼嗆嗚詠嚨嚀噝鹹響啞噠嘵嗶噦嘩噲嚌噥喲嘜嗊嘮啢嗩喚嘖嗇囀齧囉嘽嘯噴嘍嚳囁噯噓嚶囑嚕囂團園囪圍圇國圖圓聖壙場壞塊堅壇壢壩塢墳墜壟壚壘墾堊墊埡塏塒塤堝塹墮壪牆壯聲殼壺處備復夠頭誇夾奪奩奐奮獎奧妝婦媽嫵嫗媯姍婁婭嬈嬌孌娛媧嫻嬰嬋嬸媼裊孫學孿寧寶實寵審憲宮寬賓寢對尋導壽將爾塵嘗堯尷盡層屓屜屆屬屢屨嶼歲豈嶇崗峴嶴嵐島嶺嶽崠巋嶨嶧峽嶢嶠崢巒嶗崍嶮嶄嶸嶔嶁巔鞏巰幣帥師幃帳簾幟帶幀幫幬幘幗冪廣慶廬廡庫應廟龐廢廒遲建異棄弒張彌弳彎彈強歸當錄彥徹徑徠憶懺憂愾懷態慫憮慪悵愴憐總懟懌戀懇惡慟懨愷惻惱惲悅愨懸慳憫驚懼慘懲憊愜慚憚慣慍憤憒願懾憖懣懶懍戇戔戲戧戰戩戶紮撲執擴捫掃揚擾撫拋摶摳掄搶護報擔擬攏揀擁攔擰撥擇掛摯攣掗撾撻挾撓擋撟掙擠揮攖撈損撿換搗據撚擄膕擲撣摻摜攬撳攙擱摟攪攜攝攄擺搖擯攤攖撐攆擷擼攛擻攢敵斂數齋斕斬斷無舊時曠暘曇晝曨顯晉曬曉曄暈暉晚曖暫術樸機殺雜權條來楊榪傑極構樅樞棗櫪梘棖槍楓梟櫃檸檉梔柵標棧櫛櫳棟櫨櫟欄樹棲樣欒椏橈楨檔榿橋樺檜槳樁夢檮棶檢欞槨櫝槧欏橢樓欖櫬櫚櫸檟檻檳櫧橫檣櫻櫫櫥櫓櫞檁歡歟歐殲歿殤殘殞殮殫殯毆毀轂畢斃氈毿氌氣氫氬氳匯漢湯洶溝沒灃漚瀝淪滄渢溈滬濔濘淚澩瀧瀘濼瀉潑澤涇潔灑窪浹淺漿澆湞溮濁測澮濟瀏滻渾滸濃潯濤澇淶漣潿渦溳渙滌潤澗漲澀澱淵淥漬瀆漸澠漁瀋滲溫遊灣濕潰濺漵漊篳滾滯灩灄滿瀅濾濫灤濱灘澦瀠瀟瀲濰潛瀦瀾瀨瀕灝滅燈靈災燦煬爐燉煒熗點煉熾爍爛烴燭煙煩燒燁燴燙燼熱煥燜燾愛爺牘犛牽犧犢強狀獷獁猶狽麅獮獰獨狹獅獪猙獄猻獫獵獼玀豬貓蝟獻獺璣璵瑒瑪瑋環現瑲璽琺瓏琿璉瑣瓊瑤璦瓔瓚甕甌電畫暢疇癤療瘧癘瘍癧瘡瘋皰屙瘂痙癢瘥癆瘓癇癡癉瘮瘞瘺癟癱癮癭癩癬癲皚皺皸盞鹽監蓋盜盤瞘眥矓著睜睞瞼瞞矚矯磯礬礦碭碼磚硨硯碸礪礱礫礎鹼矽碩硤磽磑礄確礙碎碰鹼碑碾磁磅磊磋磐磔磕磙磲礅礓礤礧礴禮禰禎禱禍稟祿禪離禿稈種積稱穢穌穩穡窮竊竅窯竄窩窺竇窶豎競篤筍筆筧箋籠籩築篳篩箏籌簽簡籙簀篋籜籮簞簫簣簍籃籬籪籟糴類秈糶糲粵糞糧糝餱緊縶糾紆紅紂纖紇約級紈纊紀紉緯紜純紕紗綱納紝縱綸紛紙紋紡紵紖紐紓線紺絏紱練組紳細織終縐絆紼絀紹繹經紿綁絨結絝繞絰絎繪給絢絳絡絕絞統綆綃絹繡綌綏絛繼綈績緒綾緓續綺緋綽緔緄繩維綿綬繃綢綯綹綣綜綻綰綠綴緇緙緗緘緬纜緹緲緝縕繢緦綞緞緶線緱縋緩締縷編緡緣縉縛縟縝縫縗縞纏縭縊縑繽縹縵縲纓縮繆繅纈繚繕繒韁繾繰繯繳纘罌網羅罰罷羆羈羥羨翹翽翬耮耬聳恥聶聾職聹聯聵聰肅腸膚膁腎腫脹脅膽勝朧腖臚脛膠脈膾髒臍腦膿臠腳脫腡臉臘醃膕齶膩靦膃騰臏臢輿艤艦艙艫艱艷艸藝節羋薌蕪蘆蓯葦藶莧萇蒼苧蘇蘋莖蘢蔦塋煢繭荊薦薘莢蕘蓽蕎薈薺蕩榮葷滎犖熒蕁藎蓀蔭蕒葒葤藥蒞萊蓮蒔萵薟獲蕕瑩鶯蒓蘀蘿螢營縈蕭薩蔥蕆蕢蔣蔞藍薊蘺蕷鎣驀薔蘞藺藹蘄蘊藪蘚虜慮虛蟲虯蟣雖蝦蠆蝕蟻螞蠶蠔蜆蠱蠣蟶蠻蟄蛺蟯螄蠐蛻蝸蠟蠅蟈蟬蠍螻蠑螿蟎蠨釁銜補襯袞襖裊褘襪襲襏裝襠褳襝褲襇褸襤見觀覎規覓視覘覽覺覬覡覿覥覦覯覲覷觴觸觶譽謄計訂訃認譏訐訌討讓訕訖訓議訊記訒講諱謳詎訝訥許訛論訩訟諷設訪訣證詁訶評詛識詗詐訴診詆謅詞詘詔詖譯詒誆誄試詿詩詰詼誠誅詵話誕詬詮詭詢詣諍該詳詫諢詡譸誡誣語誚誤誥誘誨誑說誦誒請諸諏諾讀諑誹課諉諛誰岑調諂諒諄誶談誼謀諶諜謊諫諧謔謁謂諤諭諼讒諮諳諺諦謎諞諝謨讜謖謝謠謗諡謙謐謹謾謫譾謬譚譖譙讕譜譎讞譴譫讖穀豶貝貞負貟貢財責賢敗賬貨質販貪貧貶購貯貫貳賤賁貰貼貴貺貸貿費賀貽賊贄賈賄貲賃賂贓資賅贐賕賑賚賒賦賭齎贖賞賜贔賙賡賠賧賴賵贅賻賺賽賾贋贊贇贈贍贏贛赬趙趕趨趲躉躍蹌蹠躒踐躂蹺蹕躚躋踴躊蹤躓躑躡蹣躕躥躪躦軀車軋軌軒軑軔轉軛輪軟轟軲軻轤軸軹軼軤軫轢軺輕軾載輊轎輈輇輅較輒輔輛輦輩輝輥輞輬輟輜輳輻輯轀輸轡轅轄輾轆轍轔辭辟辯辮邊遼達遷過邁運還這進遠違連遲邇逕跡適選遜遞邐邏遺遙鄧鄺鄔郵鄒鄴鄰鬱郤郟鄶鄭鄆酈鄖鄲醞醱醬釅釃釀釋裏鉅鑒鑾鏨釓釔針釘釗釙釕釷釺釧釤鈒釩釣鍆釹鍚釵鈃鈣鈈鈦鉅鈍鈔鐘鈉鋇鋼鈑鈐鑰欽鈞鎢鉤鈧鈁鈥鈄鈕鈀鈺錢鉦鉗鈷缽鈳鉕鈽鈸鉞鑽鉬鉭鉀鈿鈾鐵鉑鈴鑠鉛鉚鈰鉉鉈鉍鈹鐸鉶銬銠鉺銪鋏鋣鐃銍鐺銅鋁銱銦鎧鍘銖銑鋌銩銛鏵銓鉿銚鉻銘錚銫鉸銥鏟銃鐋銨銀銣鑄鐒鋪鋙錸鋱鏈鏗銷鎖鋰鋥鋤鍋鋯鋨鏽銼鋝鋒鋅鐦鐧銳銻鋃鋟鋦錒錆鍺錯錨錛錡鍀錁錕錩錫錮鑼錘錐錦鑕鍁錈鍃錇錟錠鍵鋸錳錙鍥鍈鍇鏘鍶鍔鍤鍬鐘鍛鎪鍰鎄鍍鎂鏤鎡鐨鎇鏌鎮鎛鎘鑷钂鐫鎳鎿鎦鎬鎊鎰鎵鑌鎔鏢鏜鏝鏍鏰鏞鏡鏑鏃鏇鏐鐔鐝鐐鏷鑥鐓鑭鐠鑹鏹鐙鑊鐳鐶鐲鐮鐿鑔鑣鑞鑲長門閂閃閆閈閉問闖閏闈閑閎間閔閌悶閘鬧閨聞闥閩閭闓閥閣閡閫鬮閱閬闍閾閹閶鬩閿閽閻閼闡闌闃闠闊闋闔闐闒闕闞闤隊陽陰陣階際陸隴陳陘陝隉隕險隨隱隸雋難雛鮂靂霧霽黴靄靚靜靨韃鞽韉韝韋韌韍韓韙韞韜韻頁頂頃頇項順須頊頑顧頓頎頒頌頏預顱領頗頸頡頰頲頜潁熲頦頤頻頮頹頷穎穎顆題顒顎顓顏額顳顢顛顙顥纇顫顬顰顴風颺颭颮颯颶颔颼颻飀飄飆飆飛饗饜餐飢飥駧飩餼飪飫飭飯飲餞飾飽飼飿飴餌饒餉餄餎餃餏餅餑餖餓餘餒餕餜餛餡館餷饋餶餿饞饁饃餺餾饈饉饅饊饌饢馬馭馱馴馳驅馹駁驢駔駛駟駙駒騶駐駝駑駕驛駘驍罵駰驕驊駱駭駢驫驪騁驗騂駎駿騏騎騍騅騌驌驂騙騭騤騷騖驁騮騫騸驃騾驄驏驟驥驦驤骨髏髖髕魔魘鬢鬧鬩鬥鬧鬩鬮鬱魎魘魚魛魢魷魨魯魴魸鮂鮁鮃鮎鱸鮋鮓鮒鮊鮑鱟鮍鮐鮭鮚鮳鮪鮞鮦鰂鮜鱠鱭鮫鮮鮺鯗鱘鯁鱺鰱鰹鯉鰣鰷鯀鯊鯇鮶鯽鯒鯖鯪鯕鯫鯡鯤鯧鯝鯢鯰鯛鯨鰺鯴鯔鱝鰈鰏鱨鯷鰛鰃鰓鱷鰍鰒鰉鰁鱂鯿鰠鰲鰭鰨鰥鰩鰟鰜鰳鰾鱈鱉鰻鰵鱅䲁鰼鱖鱔鱗鱒鱯鱤鱧鱣鳥鳩雞鳶鳴鳲鷗鴉鶬鴇鴆鴣鶇鸕鴨鴞鴦鴒鴟鴝鴛鷽鴕鷥鷙鴯鴰鵂鴴鵃鴿鸞鴻鵐鵓鸝鵑鵠鵝鵒鷴鵜鵡鵲鶓鵪鶤鵯鵬鵮鶉鶊鵷鷫鶘鶡鶚鶻鶖鷀鶥騖鷊鷂鶲鶹鶺鷁鶼鶴鷖鸚鷓鷚鷯鷦鷲鷸鷺鸇鷹鸌鸏鸛鸘麥麩黃黌黶黷黲黽鼋鼂鼉鞀鼴齊齏齒齔齁齗齟齡齙齠齜齦齬齪齲齷龍龐龔龕龜匯";

    // 状态记录变量
    let currentLang = GM_getValue('yf_lang', 'cn'); // 'cn' (简) 或 'tw' (繁)

    function convertStr(text, toTw) {
        if (!text) return text;
        const from = toTw ? sChars : tChars;
        const to = toTw ? tChars : sChars;
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const idx = from.indexOf(char);
            result += (idx !== -1) ? to[idx] : char;
        }
        return result;
    }

    function traverseAndConvert(node, toTw) {
        if (node.nodeType === 3) {
            const newText = convertStr(node.nodeValue, toTw);
            if (newText !== node.nodeValue) {
                node.nodeValue = newText;
            }
        } else if (node.nodeType === 1) {
            const tag = node.tagName.toUpperCase();
            // 跳过无需转换的系统标签
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return;
            for (let child of node.childNodes) {
                traverseAndConvert(child, toTw);
            }
        }
    }

    // 切换并保存语言
    function applyLang(lang) {
        currentLang = lang;
        GM_setValue('yf_lang', lang);
        const isTw = lang === 'tw';
        
        // 更新按钮 UI (选中状态为谷歌浅蓝，未选中为普通色)
        const btnCn = head.querySelector('.yf-lang-cn');
        const btnTw = head.querySelector('.yf-lang-tw');
        btnCn.className = 'yf-lang-btn yf-lang-cn' + (isTw ? '' : ' active');
        btnTw.className = 'yf-lang-btn yf-lang-tw' + (isTw ? ' active' : '');

        // 执行全网页转换
        traverseAndConvert(document.body, isTw);
    }

    // 绑定切换按钮的点击事件
    head.querySelectorAll('.yf-lang-btn').forEach(btn => {
        btn.onclick = (ev) => {
            ev.stopPropagation(); // 阻止拖拽冒泡
            applyLang(btn.dataset.lang);
        };
    });

    // 绑定关闭面板事件
    const closeBtn = head.querySelector('.yf-close');
    closeBtn.onclick = (ev) => {
        ev.stopPropagation();
        panel.style.display = 'none';
    };

    // ======== 拖拽与缩放控制 ========
    const pos = GM_getValue('pos', {});

    function placePanel(el, left, top) {
        el.style.left = Math.max(0, Math.min(left, innerWidth - el.offsetWidth)) + 'px';
        el.style.top = Math.max(0, Math.min(top, innerHeight - 40)) + 'px';
    }

    function savePos() {
        GM_setValue('pos', {
            tab: { top: tab.style.top }, 
            panel: { left: panel.style.left, top: panel.style.top, w: panel.style.width, h: panel.style.height }
        });
    }

    function makeTabDraggable(tabEl) {
        tabEl.onpointerdown = ev => {
            if (ev.button !== 0) return;
            const sy = ev.clientY;
            const top = parseFloat(tabEl.style.top) || Math.round(innerHeight * 0.4);
            tabEl.dragged = false;
            tabEl.setPointerCapture(ev.pointerId);
            
            tabEl.onpointermove = e => {
                if (Math.abs(e.clientY - sy) > 3) tabEl.dragged = true;
                if (tabEl.dragged) {
                    tabEl.style.top = Math.max(0, Math.min(top + e.clientY - sy, innerHeight - tabEl.offsetHeight)) + 'px';
                }
            };
            tabEl.onpointerup = () => {
                tabEl.onpointermove = null;
                tabEl.onpointerup = null;
                if (tabEl.dragged) savePos();
            };
        };
    }

    function makePanelDraggable(panelEl, handle) {
        handle.onpointerdown = ev => {
            // 如果点击的是关闭按钮或者简繁切换按钮，则不触发拖拽
            if (ev.button !== 0 || ev.target.closest('.yf-close, .yf-lang-toggle')) return;
            
            const sx = ev.clientX, sy = ev.clientY;
            const left = parseFloat(panelEl.style.left), top = parseFloat(panelEl.style.top);
            handle.dragged = false;
            handle.setPointerCapture(ev.pointerId);
            handle.onpointermove = e => {
                if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 3) handle.dragged = true;
                if (handle.dragged) placePanel(panelEl, left + e.clientX - sx, top + e.clientY - sy);
            };
            handle.onpointerup = () => {
                handle.onpointermove = null;
                handle.onpointerup = null;
                if (handle.dragged) savePos();
            };
        };
    }

    const t = pos.tab || {};
    tab.style.top = t.top || Math.round(innerHeight * 0.4) + 'px';
    
    const p = pos.panel || {};
    panel.style.left = p.left || Math.max(0, innerWidth - 96 - 340 - 28) + 'px';
    panel.style.top = p.top || '60px';
    if (p.w) panel.style.width = p.w;
    if (p.h) panel.style.height = p.h;

    makeTabDraggable(tab);           
    makePanelDraggable(panel, head); 

    let timer;
    new ResizeObserver(() => {
        const r = panel.offsetWidth / 340;
        panel.style.setProperty('--yf-s', Math.min(4, Math.max(1, 1 + (r - 1) * 0.7))); 
        clearTimeout(timer);
        timer = setTimeout(savePos, 300);
    }).observe(panel);

    tab.onclick = () => {
        if (tab.dragged) return;
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        if (panel.style.display === 'block') placePanel(panel, parseFloat(panel.style.left), parseFloat(panel.style.top));
    };

    // ======== 核心：全局特征抓取 ========
    const titleSelector = 'p[class*="title_cn"], td[class*="date_title"], .title_cn_r, .title_cn';
    
    let cachedImages = [];
    let cachedDateHeaders = [];

    function initCaches() {
        cachedImages = [...document.querySelectorAll('img')].filter(img => {
            const w = img.clientWidth || parseInt(img.getAttribute('width') || '0', 10);
            return (w > 50 || img.getAttribute('width')?.includes('120')) && !coverUrl(img).includes('blank.gif');
        });
        
        cachedDateHeaders = [...document.querySelectorAll('td[class*="date"], th, .date, .date2')].filter(el => 
            /周[一二三四五六日]/.test(el.textContent)
        );
    }

    function coverUrl(img) {
        if (!img) return '';
        const list = [img.getAttribute('data-src'), img.getAttribute('data-original'), img.getAttribute('data-lazy-src'), img.currentSrc, img.src];
        const u = list.find(x => x && !x.startsWith('data:') && !x.includes('blank.gif'));
        return u ? new URL(u, location.href).href : '';
    }

    function detectAnimeCards() {
        const results = [];
        document.querySelectorAll(titleSelector).forEach(cnEl => {
            const cnText = clean(cnEl.textContent);
            if (!cnText) return;

            let box = cnEl.parentElement;
            let depth = 0;
            while (box.parentElement && depth < 5 && box.tagName !== 'TABLE' && box.tagName !== 'BODY') {
                box = box.parentElement;
                depth++;
            }
            results.push({ cnEl, box, cnText, key: month + '|' + cnText });
        });
        return results;
    }

    function extractAnimeData(entry) {
        const { cnEl, box, cnText } = entry;
        
        let cover = '';
        for (let i = cachedImages.length - 1; i >= 0; i--) {
            if (cachedImages[i].compareDocumentPosition(cnEl) & Node.DOCUMENT_POSITION_FOLLOWING) {
                cover = coverUrl(cachedImages[i]);
                break;
            }
        }

        let day = '';
        const boxText = clean(box.textContent);
        
        const wMatch = boxText.match(/\d{1,2}\/\d{1,2}\s*周([一二三四五六日])/) || 
                       boxText.match(/周([一二三四五六日])(?:深夜|晚间|下午|早间|上午|中午|凌晨)?/);
        if (wMatch) {
            day = '周' + wMatch[1];
        } else {
            for (let i = cachedDateHeaders.length - 1; i >= 0; i--) {
                if (cachedDateHeaders[i].compareDocumentPosition(cnEl) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    const match = clean(cachedDateHeaders[i].textContent).match(/周([一二三四五六日])/);
                    if (match) {
                        day = '周' + match[1];
                        break;
                    }
                }
            }
        }

        const textFrom = sel => { const el = box.querySelector(sel); return el ? clean(el.textContent) : ''; };
        const tds = box.querySelectorAll('td[class*="type"]');

        return {
            cn: cnText,
            jp: textFrom('p[class*="title_jp"]'),
            cover: cover,
            day: day,
            type: tds[0] ? clean(tds[0].textContent) : '',
            genre: tds[1] ? clean(tds[1].textContent) : '',
            month,
            ym
        };
    }

    function fetchImageAsBase64(url) {
        return new Promise((resolve) => {
            if (!url) return resolve('');
            GM_xmlhttpRequest({
                method: 'GET', url: url, responseType: 'blob',
                headers: { 'Referer': 'https://yuc.wiki/', 'User-Agent': navigator.userAgent },
                onload: (res) => {
                    if (res.status === 200) {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = () => resolve(url);
                        reader.readAsDataURL(res.response);
                    } else resolve(url);
                },
                onerror: () => resolve(url)
            });
        });
    }

    function render() {
        const favs = load();
        const list = Object.values(favs);
        count.textContent = list.length;
        if (!list.length) {
            content.innerHTML = '<p style="padding:10px">还没有收藏，点标题栏右边的 ☆ 加入</p>';
            // 如果面板里是空提示，也根据语言转换
            traverseAndConvert(content, currentLang === 'tw');
            return;
        }
        const groups = {};
        list.forEach(f => { (groups[f.month] = groups[f.month] || []).push(f); });
        const months = Object.keys(groups).sort((a, b) => groups[b][0].ym - groups[a][0].ym);
        
        content.innerHTML = '<details open><summary>我想看的</summary>' + months.map(mo =>
            '<details open><summary>' + esc(mo) + ' (' + groups[mo].length + ')</summary>' +
            groups[mo].sort((a, b) => a.t - b.t).map(f =>
                '<div class="yf-item"><img referrerpolicy="no-referrer" src="' + esc(f.cover) + '">' +
                '<div class="yf-info">' +
                '<div class="yf-cn">' + (f.day ? '<span class="yf-day-inline">[' + esc(f.day) + ']</span>' : '') + esc(f.cn) + '</div>' +
                '<div class="yf-jp">' + esc(f.jp) + '</div>' +
                '<div class="yf-tag">' + esc(f.type) + (f.genre ? ' | ' + esc(f.genre) : '') + '</div></div>' +
                '<span class="yf-del" data-key="' + esc(f.month + '|' + f.cn) + '">×</span></div>'
            ).join('') + '</details>'
        ).join('') + '</details>';

        // [绝妙设计] 每次重新渲染收藏面板内容后，立刻强制校准一遍繁简体，
        // 确保无论以前存进数据库的是什么语言，显示出来的一定是你当前选择的语言！
        traverseAndConvert(content, currentLang === 'tw');
    }

    function refresh() {
        const favs = load();
        entries.forEach(e => {
            if (e.star) e.star.textContent = favs[e.key] ? '★' : '☆';
        });
        render();
    }

    panel.onclick = ev => {
        const k = ev.target.dataset.key;
        if (!k) return;
        const favs = load();
        delete favs[k];
        save(favs);
        refresh();
    };

    initCaches();
    const entries = detectAnimeCards();

    entries.forEach(e => {
        const host = e.cnEl;
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

        const star = document.createElement('span');
        star.className = 'yf-star';
        star.title = '加入我想看的';
        star.onclick = async (ev) => {
            ev.stopPropagation();
            const favs = load();
            if (favs[e.key]) {
                delete favs[e.key];
                save(favs);
                refresh();
            } else {
                star.textContent = '⏳';
                const data = extractAnimeData(e);
                const base64Cover = await fetchImageAsBase64(data.cover);
                if (base64Cover) data.cover = base64Cover;

                favs[e.key] = Object.assign(data, { t: Date.now() });
                save(favs);
                refresh();
            }
        };
        host.appendChild(star);
        e.star = star;
    });

    refresh();

    // 页面完全加载后，如果记忆状态是繁体，则自动初始化语言
    setTimeout(() => { applyLang(currentLang); }, 50);

})();
