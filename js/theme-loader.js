(function() {
    // 檢查使用者偏好
    const darkMode = localStorage.getItem('darkMode') === 'true';
    
    // 套用深色模式
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.style.backgroundColor = '#212121';
    } else {
      document.documentElement.style.backgroundColor = '#f9f9f9';
    }
    
    // 檢查系統偏好深色模式
    function checkSystemPreference() {
      // 只在沒有使用者設定的情況下檢查系統偏好
      if (localStorage.getItem('darkMode') === null) {
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (prefersDarkMode) {
          document.documentElement.classList.add('dark-mode');
          document.documentElement.style.backgroundColor = '#212121';
          localStorage.setItem('darkMode', 'true');
        } else {
          document.documentElement.classList.remove('dark-mode');
          document.documentElement.style.backgroundColor = '#f9f9f9';
          localStorage.setItem('darkMode', 'false');
        }
      }
    }
    
    // 監聽系統主題變更
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', checkSystemPreference);
    
    // 初始檢查
    checkSystemPreference();
  })();