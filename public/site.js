/* 全站共享：主题三态 + 中英切换。
   注意：应用主题的那一小段必须内联在 <head> 里同步执行，否则会闪一下。
   这个文件只负责「切换控件」和「文案替换」，晚一点执行没关系。 */
(() => {
  const KT = 'totem-theme', KL = 'totem-lang';
  const html = document.documentElement;

  const getTheme = () => localStorage.getItem(KT) || 'system';
  const getLang  = () => html.dataset.lang || 'zh';

  function applyTheme(v){
    if (v === 'system') delete html.dataset.theme;
    else html.dataset.theme = v;
    localStorage.setItem(KT, v);
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.content = getComputedStyle(html).getPropertyValue('--paper').trim();
  }

  /* ── 文案替换 ──
     中文写在 HTML 里当默认值，字典只存英文。
     data-i18n      换纯文本
     data-i18n-html 换带标签的内容
     data-i18n-attr 换属性，写法 "placeholder:key,title:key2" */
  function applyLang(lang){
    const dict = (window.I18N || {})[lang] || null;
    html.dataset.lang = lang;
    html.lang = lang === 'zh' ? 'zh' : 'en';
    localStorage.setItem(KL, lang);

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      if (el.dataset.zh == null) el.dataset.zh = el.textContent;
      const v = dict && dict[el.dataset.i18n];
      el.textContent = v != null ? v : el.dataset.zh;
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      if (el.dataset.zhHtml == null) el.dataset.zhHtml = el.innerHTML;
      const v = dict && dict[el.dataset.i18nHtml];
      el.innerHTML = v != null ? v : el.dataset.zhHtml;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(',').forEach((pair) => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        if (!attr || !key) return;
        const memo = 'zhAttr' + attr;
        if (el.dataset[memo] == null) el.dataset[memo] = el.getAttribute(attr) || '';
        const v = dict && dict[key];
        el.setAttribute(attr, v != null ? v : el.dataset[memo]);
      });
    });
    const t = dict && dict[html.dataset.titleKey];
    if (t) document.title = t;
    else if (html.dataset.zhTitle) document.title = html.dataset.zhTitle;

    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
    html.classList.remove('i18n-pending');
  }

  /* ── 控件 ── */
  const L = {
    zh: { auto:'自动', light:'亮', dark:'暗', themeTip:'点一下切换外观', langTip:'切换语言' },
    en: { auto:'Auto', light:'Light', dark:'Dark', themeTip:'Click to change appearance', langTip:'Switch language' },
  };
  function renderControls(){
    document.querySelectorAll('[data-controls]').forEach((mount) => {
      mount.innerHTML =
        '<div class="ctl">' +
          '<div class="seg"><button type="button" data-theme-cycle></button></div>' +
          '<div class="seg lang">' +
            '<button type="button" data-set-lang="zh">中</button>' +
            '<button type="button" data-set-lang="en">EN</button>' +
          '</div>' +
        '</div>';
    });
    sync();
  }
  function sync(){
    const lang = getLang(), theme = getTheme(), w = L[lang] || L.zh;
    document.querySelectorAll('[data-theme-cycle]').forEach((b) => {
      b.textContent = w[theme === 'system' ? 'auto' : theme];
      b.setAttribute('aria-pressed', String(theme !== 'system'));
      b.title = w.themeTip;
    });
    document.querySelectorAll('[data-set-lang]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.setLang === lang));
      b.title = w.langTip;
    });
  }

  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-theme-cycle]');
    if (c){
      const order = ['system','light','dark'];
      applyTheme(order[(order.indexOf(getTheme()) + 1) % 3]);
      sync();
      return;
    }
    const l = e.target.closest('[data-set-lang]');
    if (l && l.dataset.setLang !== getLang()){ applyLang(l.dataset.setLang); sync(); }
  });

  /* 跟随系统时，系统切换要实时反映到按钮上 */
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (getTheme()==='system') sync(); });

  /* ── 素材随机轮播 ──
     给容器加 data-rotate，它下面的 <img> 就是槽位。
     进页面随机换一组，之后每 5 秒再换一波；每张错开一点，读起来像一波而不是齐刷刷跳。 */
  const ART = ['A1','A1r','A2','A2r','B1','B1r','B2','B2r','C1','C1r','C2','C2r','owl'];
  const SRC = (n) => '/showcase/' + n + '.webp';

  function pick(n, avoid){
    const pool = ART.filter((x) => !avoid || !avoid.includes(x));
    const src = pool.length >= n ? pool : ART.slice();
    const out = [];
    const bag = src.slice();
    while (out.length < n && bag.length) out.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
    return out;
  }
  const preload = (names) => names.forEach((n) => { const i = new Image(); i.src = SRC(n); });

  function startRotators(){
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-rotate]').forEach((box) => {
      const slots = [...box.querySelectorAll('img')];
      if (!slots.length) return;

      let cur = pick(slots.length);
      slots.forEach((im, i) => { im.src = SRC(cur[i]); });   // 进页面就先随机一组
      if (reduce || slots.length >= ART.length) return;       // 降级：不自动轮换

      let next = pick(slots.length, cur);
      preload(next);

      setInterval(() => {
        if (document.hidden) return;                          // 页面在后台时不空转
        const use = next;
        slots.forEach((im, i) => {
          setTimeout(() => {
            im.classList.add('swapping');                     // 先淡出，避免两张图同时半透明糊在一起
            setTimeout(() => {
              im.src = SRC(use[i]);
              im.classList.remove('swapping');
            }, 340);
          }, i * 140);                                        // 每张错开，形成一波
        });
        cur = use;
        next = pick(slots.length, cur);
        preload(next);
      }, 5000);
    });
  }

  function boot(){
    if (!html.dataset.zhTitle) html.dataset.zhTitle = document.title;
    renderControls();
    applyLang(getLang());
    sync();
    startRotators();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
