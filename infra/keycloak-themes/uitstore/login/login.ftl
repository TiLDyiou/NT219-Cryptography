<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
  <#if section = "header"></#if>
  <#if section = "form">
    <div class="login-container">
      <div class="login-grid">
        <aside class="login-visual">
          <div>
            <div class="brand-mark">UIT</div>
            <h1>Dang nhap an toan</h1>
            <p>UIT Store dung Authorization Code + PKCE, MFA va SSO do Keycloak xu ly.</p>
          </div>
          <p>Mat khau khong di qua SPA.</p>
        </aside>
        <main class="login-panel">
          <h2 class="login-title">Chao mung tro lai</h2>
          <p class="login-subtitle">Dang nhap tai khoan UIT Store cua ban.</p>
          <#if message?has_content && (message.type = 'error')>
            <div class="alert-error">${kcSanitize(message.summary)?no_esc}</div>
          </#if>
          <form id="kc-form-login" action="${url.loginAction}" method="post">
            <div class="form-group">
              <label for="username">Email hoac ten dang nhap</label>
              <input id="username" name="username" type="text" value="${(login.username!'')}" autocomplete="username" autofocus />
            </div>
            <div class="form-group">
              <label for="password">Mat khau</label>
              <input id="password" name="password" type="password" autocomplete="current-password" />
            </div>
            <#if realm.rememberMe && !usernameHidden??>
              <div class="form-group">
                <label><input id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if> /> Ghi nho dang nhap</label>
              </div>
            </#if>
            <button class="btn-primary" type="submit">Dang nhap</button>
          </form>
          <div class="form-links">
            <#if realm.resetPasswordAllowed>
              <a href="${url.loginResetCredentialsUrl}">Quen mat khau?</a>
            </#if>
            <#if realm.registrationAllowed && !registrationDisabled??>
              <a href="${url.registrationUrl}">Dang ky ngay</a>
            </#if>
          </div>
        </main>
      </div>
    </div>
  </#if>
</@layout.registrationLayout>
