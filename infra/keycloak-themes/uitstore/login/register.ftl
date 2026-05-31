<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm'); section>
  <#if section = "header"></#if>
  <#if section = "form">
    <div class="login-container">
      <div class="login-grid">
        <aside class="login-visual">
          <div>
            <div class="brand-mark">UIT</div>
            <h1>Tao tai khoan UIT Store</h1>
            <p>Keycloak ap dung password policy, email uniqueness, MFA va SSO.</p>
          </div>
          <p>SPA khong nhan mat khau nguoi dung.</p>
        </aside>
        <main class="login-panel">
          <h2 class="login-title">Dang ky tai khoan</h2>
          <p class="login-subtitle">Thong tin nay duoc gui truc tiep cho Keycloak.</p>
          <#if message?has_content && (message.type = 'error')>
            <div class="alert-error">${kcSanitize(message.summary)?no_esc}</div>
          </#if>
          <form id="kc-register-form" action="${url.registrationAction}" method="post">
            <div class="form-group">
              <label for="firstName">Ho</label>
              <input id="firstName" name="firstName" type="text" value="${(register.formData.firstName!'')}" autocomplete="given-name" />
            </div>
            <div class="form-group">
              <label for="lastName">Ten</label>
              <input id="lastName" name="lastName" type="text" value="${(register.formData.lastName!'')}" autocomplete="family-name" />
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" value="${(register.formData.email!'')}" autocomplete="email" />
            </div>
            <#if !realm.registrationEmailAsUsername>
              <div class="form-group">
                <label for="username">Ten dang nhap</label>
                <input id="username" name="username" type="text" value="${(register.formData.username!'')}" autocomplete="username" />
              </div>
            </#if>
            <#if passwordRequired??>
              <div class="form-group">
                <label for="password">Mat khau</label>
                <input id="password" name="password" type="password" autocomplete="new-password" />
              </div>
              <div class="form-group">
                <label for="password-confirm">Nhap lai mat khau</label>
                <input id="password-confirm" name="password-confirm" type="password" autocomplete="new-password" />
              </div>
            </#if>
            <button class="btn-primary" type="submit">Dang ky</button>
          </form>
          <div class="form-links">
            <a href="${url.loginUrl}">Quay lai dang nhap</a>
          </div>
        </main>
      </div>
    </div>
  </#if>
</@layout.registrationLayout>
