/* Capacitor 原生交互层:硬件返回键、双击退出、状态栏。
   仅在安卓 app 环境生效,浏览器中自动跳过。 */
(function () {
  function boot() {
    var Cap = window.Capacitor;
    if (!Cap || !Cap.Plugins || !Cap.Plugins.App) return;
    var App = Cap.Plugins.App;
    var Toast = Cap.Plugins.Toast;
    var StatusBar = Cap.Plugins.StatusBar;

    // 状态栏与页面底色一致(浅色主题 + 深色图标)
    try {
      if (StatusBar) {
        StatusBar.setStyle({ style: 'LIGHT' });
        StatusBar.setBackgroundColor({ color: '#f4f4f5' });
      }
    } catch (e) { /* Android 15+ edge-to-edge 下为 no-op */ }

    var lastBack = 0;
    App.addListener('backButton', function () {
      // 1. 动作详情弹窗打开时:返回键先关闭弹窗
      var overlay = document.getElementById('modal-overlay');
      if (overlay && overlay.classList.contains('open')) {
        var closeBtn = document.getElementById('modal-close');
        if (closeBtn) closeBtn.click();
        return;
      }
      // 2. 两秒内连按两次返回键退出,符合安卓习惯
      var now = Date.now();
      if (now - lastBack < 2000) {
        App.exitApp();
        return;
      }
      lastBack = now;
      try {
        if (Toast) Toast.show({ text: '再按一次返回键退出', duration: 'short' });
      } catch (e) {
        App.exitApp();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
