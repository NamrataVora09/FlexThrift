# Auth Controller — Methods Summary

This document summarizes the methods in `app/Controllers/Auth.php` for quick reference (paste rows into your spreadsheet).

| Sr No | Page / Module | Description | Technical Details |
|---|---|---|---|
| 1 | Registration | Shows registration form to create new user. | Controller: `Auth::register()` — Route: `GET /register` — View: app/Views/register.php — Request: GET — Outputs: HTML form — Notes: form posts to `POST /auth/process-register`. |
| 2 | Process Registration | Validates input, inserts user, generates OTP, sends OTP email and redirects to OTP verify page. | Controller: `Auth::processRegister()` — Route: `POST /auth/process-register` — Inputs: `name,email,mobile,password,address,pin_code,user_type` — Validation: required, email unique — Actions: `UserModel->insert()`, `UserModel->generateOTP()`, `sendOTPEmail()` — Session: sets `registration_email` — Redirects: `/verify-otp`. |
| 3 | Login (OTP page) | Shows OTP-request login page (enter email to receive OTP). | Controller: `Auth::login()` — Route: `GET /auth/login` — View: app/Views/login_otp.php — Request: GET — Outputs: HTML form that posts to `POST /auth/send-login-otp`. |
| 4 | Send Login OTP | Generates OTP for existing user and sends via email. | Controller: `Auth::sendLoginOTP()` — Route: `POST /auth/send-login-otp` — Inputs: `email` — Actions: `UserModel->getUserByEmail()`, `UserModel->generateOTP()`, `sendOTPEmail()` — Session: sets `login_email` — Redirects: `/verify-otp`. |
| 5 | Password Login | Authenticate user using email+password, set session and redirect based on role. | Controller: `Auth::processPasswordLogin()` — Route: `POST /auth/process-password-login` — Inputs: `email,password` — Actions: `UserModel->verifyPassword()` — On success: set session keys (`user_id,user_name,name,user_email,email,user_type,role,reliability_score,isLoggedIn,logged_in`) and redirect to dashboard per role (`/seller/dashboard`, `/admin/dashboard`, `/superadmin/dashboard`, `/delivery/dashboard`, `/buyer`). |
| 6 | OTP Verify Page | Show page where user enters OTP received by email. | Controller: `Auth::verifyOTP()` — Route: `GET /verify-otp` — View: app/Views/verify_otp.php — Reads `registration_email` or `login_email` from session — Outputs: OTP input form. |
| 7 | Process OTP Verification | Validate OTP, set authenticated session and redirect to dashboard. | Controller: `Auth::processVerifyOTP()` — Route: `POST /auth/process-verify-otp` — Inputs: `otp` + session `registration_email`/`login_email` — Actions: `UserModel->verifyOTP()` — On success set same session keys as password login, clear temporary session keys, redirect to `/dashboard`. |
| 8 | Logout | Destroy session and redirect to home. | Controller: `Auth::logout()` — Route: `GET /auth/logout` — Actions: `session()->destroy()` — Redirect: `/` with flash message. |
| 9 | Send OTP Email (helper) | Composes and sends HTML OTP email and logs debug info. | Method: `private sendOTPEmail($to,$name,$otp)` — Uses `ConfigServices::email()` — Builds HTML body, calls `send()`, writes debug file to `WRITEPATH/logs/email_debug_*.log`, logs via `log_message()`. |
| 10 | Dashboard redirector | Redirects logged-in user to appropriate dashboard based on `role`. | Controller: `Auth::dashboard()` — Route: `GET /dashboard` — Reads session `role` and `logged_in` — Redirects to dashboards: `/seller/dashboard`, `/admin/dashboard`, `/superadmin/dashboard`, `/delivery/dashboard`, or `/buyer`. |

**Common notes**
- Controller file: `app/Controllers/Auth.php`
- Model used: `UserModel` (`app/Models/UserModel.php`) — used methods: `insert()`, `generateOTP()`, `getUserByEmail()`, `verifyPassword()`, `verifyOTP()`.
- Session keys set on login/verify: `user_id`, `user_name`, `name`, `user_email`, `email`, `user_type`, `role`, `reliability_score`, `isLoggedIn`, `logged_in`.
- Email: uses CodeIgniter Email service; debug logs are stored in `WRITEPATH`.

You can copy rows from the table directly into your spreadsheet. If you want a CSV version or to include `UserModel` method details similarly, tell me and I will add it.