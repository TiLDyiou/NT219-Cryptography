<#import "template.ftl" as layout>
<#import "_macros.ftl" as uit>
<@layout.registrationLayout displayMessage=false displayInfo=false; section>
  <#if section == "form">
    <div class="login-container">
      <div class="login-grid">
        <aside class="login-visual">
          <div class="login-visual-top">
            <@uit.brandRow />
            <h1>Tạo tài khoản<br/>UIT Store</h1>
            <p>Mật khẩu được bảo vệ bằng <strong>Argon2id</strong> khi lưu trên Keycloak.</p>
          </div>
          <div class="feature-list">
            <@uit.featureItem icon="shield-check" title="Mật khẩu không bao giờ lưu plain" sub="Argon2id · per-user salt · server-side pepper" />
            <@uit.featureItem icon="lock" title="Phiên đăng nhập JWT 5 phút" sub="Refresh token rotation" />
            <@uit.featureItem icon="check-circle" title="Đăng ký qua Keycloak" sub="Không lưu tài khoản trong trình duyệt" />
          </div>
          <@uit.visualDecorations />
        </aside>

        <main class="login-panel">
          <a class="back-link" href="${url.loginUrl}">
            <@uit.svgIcon name="arrow-left" size=12 />
            Quay lại đăng nhập
          </a>

          <h2 class="login-title">Tạo tài khoản mới</h2>
          <p class="login-subtitle">Điền thông tin để tạo tài khoản UIT Store</p>

          <#if message?has_content && (message.type == 'error' || message.type == 'warning')>
            <div class="alert-error" role="alert">${kcSanitize(message.summary)?no_esc}</div>
          </#if>

          <#assign regFirst = (register.formData.firstName!'')>
          <#assign regLast = (register.formData.lastName!'')>

          <form id="kc-register-form" action="${url.registrationAction}" method="post">
            <div class="form-group">
              <label class="field-label" for="fullName">Họ và tên</label>
              <input
                id="fullName"
                class="input"
                type="text"
                autocomplete="name"
                placeholder="Nguyễn Văn A"
                value="${regFirst}<#if regLast?has_content> ${regLast}</#if>"
                required
              />
              <div class="hidden-fields">
                <input id="firstName" name="firstName" type="text" value="${(register.formData.firstName!'')}" />
                <input id="lastName" name="lastName" type="text" value="${(register.formData.lastName!'')}" />
              </div>
            </div>

            <div class="form-group">
              <label class="field-label" for="email">Email</label>
              <input
                id="email"
                class="input<#if messagesPerField.existsError('email')> is-invalid</#if>"
                name="email"
                type="email"
                value="${(register.formData.email!'')}"
                autocomplete="email"
                placeholder="email@example.com"
              />
              <#if messagesPerField.existsError('email')>
                <div class="field-error">${kcSanitize(messagesPerField.get('email'))?no_esc}</div>
              </#if>
            </div>

            <#if !realm.registrationEmailAsUsername>
              <div class="form-group">
                <label class="field-label" for="username">Tên đăng nhập</label>
                <input
                  id="username"
                  class="input<#if messagesPerField.existsError('username')> is-invalid</#if>"
                  name="username"
                  type="text"
                  value="${(register.formData.username!'')}"
                  autocomplete="username"
                />
                <#if messagesPerField.existsError('username')>
                  <div class="field-error">${kcSanitize(messagesPerField.get('username'))?no_esc}</div>
                </#if>
              </div>
            </#if>

            <#if passwordRequired??>
              <div class="form-group">
                <label class="field-label" for="password">Mật khẩu</label>
                <div class="password-wrap">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autocomplete="new-password"
                    placeholder="Tối thiểu 8 ký tự"
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

              <div id="password-strength" class="form-group" hidden>
                <div class="strength-bars" aria-hidden="true">
                  <div class="strength-bar"></div>
                  <div class="strength-bar"></div>
                  <div class="strength-bar"></div>
                  <div class="strength-bar"></div>
                </div>
                <div class="strength-label"></div>
              </div>

              <div class="form-group">
                <label class="field-label" for="password-confirm">Xác nhận mật khẩu</label>
                <input
                  id="password-confirm"
                  name="password-confirm"
                  type="password"
                  autocomplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  class="input<#if messagesPerField.existsError('password-confirm')> is-invalid</#if>"
                />
                <div id="password-mismatch" class="field-error" hidden>Mật khẩu không khớp</div>
                <#if messagesPerField.existsError('password-confirm')>
                  <div class="field-error">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</div>
                </#if>
              </div>
            </#if>

            <button class="btn-primary" type="submit">Tạo tài khoản</button>
          </form>

          <div class="form-footer">
            Đã có tài khoản?
            <a href="${url.loginUrl}"><strong>Đăng nhập</strong></a>
          </div>
        </main>
      </div>
    </div>
  </#if>
</@layout.registrationLayout>
