<#import "template.ftl" as layout>
<#import "_macros.ftl" as uit>
<@layout.registrationLayout displayMessage=false displayInfo=false; section>
  <#if section == "form">
    <div class="login-container">
      <div class="login-grid">
        <aside class="login-visual">
          <div class="login-visual-top">
            <@uit.brandRow />
            <h1>Đăng nhập an toàn<br/>với OAuth2 + PKCE</h1>
            <p>
              UIT Store áp dụng các tiêu chuẩn xác thực hiện đại nhất:
              <strong> Authorization Code + PKCE</strong>, refresh-token rotation,
              và bắt buộc MFA cho tài khoản nhạy cảm.
            </p>
          </div>
          <div class="feature-list">
            <@uit.featureItem icon="shield-check" title="OAuth2 / OpenID Connect" sub="Token JWT ngắn hạn · refresh rotation" />
            <@uit.featureItem icon="fingerprint" title="WebAuthn / FIDO2" sub="Đăng nhập không mật khẩu — passkey" />
            <@uit.featureItem icon="key" title="TOTP / Authenticator App" sub="RFC 6238 · OTP 30 giây" />
            <@uit.featureItem icon="lock" title="Argon2id password hashing" sub="Resistant chống brute-force GPU" />
          </div>
          <@uit.visualDecorations />
        </aside>

        <main class="login-panel">
          <h2 class="login-title">Chào mừng trở lại</h2>
          <p class="login-subtitle">Đăng nhập tài khoản UIT Store của bạn</p>

          <#if message?has_content && (message.type == 'error' || message.type == 'warning')>
            <div class="alert-error" role="alert">${kcSanitize(message.summary)?no_esc}</div>
          </#if>

          <form id="kc-form-login" action="${url.loginAction}" method="post">
            <div class="form-group">
              <label class="field-label" for="username">Email hoặc Số điện thoại</label>
              <input
                id="username"
                class="input<#if messagesPerField.existsError('username')> is-invalid</#if>"
                name="username"
                type="text"
                value="${(login.username!'')}"
                autocomplete="username"
                placeholder="Email đã đăng ký"
                autofocus
              />
              <#if messagesPerField.existsError('username')>
                <div class="field-error">${kcSanitize(messagesPerField.get('username'))?no_esc}</div>
              </#if>
            </div>

            <div class="form-group">
              <label class="field-label" for="password">Mật khẩu</label>
              <div class="password-wrap">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="<#if messagesPerField.existsError('password')>is-invalid</#if>"
                />
                <button type="button" class="password-toggle" data-toggle-password aria-label="Hiện mật khẩu" aria-pressed="false">
                  <@uit.svgIcon name="eye" size=16 />
                </button>
              </div>
              <#if messagesPerField.existsError('password')>
                <div class="field-error">${kcSanitize(messagesPerField.get('password'))?no_esc}</div>
              </#if>
            </div>

            <#if realm.rememberMe && !usernameHidden??>
              <div class="form-row-between">
                <label>
                  <input id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if> />
                  Ghi nhớ thiết bị này
                </label>
                <#if realm.resetPasswordAllowed>
                  <a href="${url.loginResetCredentialsUrl}">Quên mật khẩu?</a>
                </#if>
              </div>
            <#elseif realm.resetPasswordAllowed>
              <div class="form-row-between" style="justify-content: flex-end;">
                <a href="${url.loginResetCredentialsUrl}">Quên mật khẩu?</a>
              </div>
            </#if>

            <button class="btn-primary" type="submit" name="login" id="kc-login">Đăng nhập</button>
          </form>

          <div class="divider-or">Hoặc</div>

          <button type="button" class="btn-passkey" disabled title="Passkey do Keycloak realm cấu hình">
            <@uit.svgIcon name="fingerprint" size=16 />
            Đăng nhập bằng Passkey (WebAuthn)
          </button>

          <div class="info-box">
            <@uit.svgIcon name="lock" size=14 />
            <span>Mật khẩu được hash với <strong>Argon2id</strong> + per-user salt + server-side pepper. UIT Store không bao giờ lưu mật khẩu dưới dạng plain.</span>
          </div>

          <#if realm.registrationAllowed && !registrationDisabled??>
            <div class="form-footer">
              Chưa có tài khoản?
              <a href="${url.registrationUrl}"><strong>Đăng ký ngay</strong></a>
            </div>
          </#if>
        </main>
      </div>
    </div>
  </#if>
</@layout.registrationLayout>
