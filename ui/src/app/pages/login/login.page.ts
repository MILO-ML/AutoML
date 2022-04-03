import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { applyActionCode, Auth, AuthProvider, confirmPasswordReset, getAdditionalUserInfo, OAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithEmailLink, signInWithPopup, signInWithRedirect, signOut, updatePassword, updateProfile, UserCredential } from '@angular/fire/auth';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import md5 from 'md5';

enum Modes {
  SignIn,
  SignUp,
  FinishSignUp,
  ResetPassword,
  ForgotPassword,
  ConfirmEmail,
  WaitingForVerification,
  Redirecting
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPageComponent {
  @Input() mode: Modes;
  modes = Modes;
  authForm = new FormGroup(
    {
      email: new FormControl('', { validators: [Validators.required, Validators.email] }),
      password: new FormControl('', { validators: [Validators.required, Validators.minLength(6)] })
    }
  );
  signUpForm = new FormGroup(
    {
      firstName: new FormControl('', { validators: [Validators.required] }),
      lastName: new FormControl('', { validators: [Validators.required] })
    }
  );

  constructor(
    private route: ActivatedRoute,
    private afAuth: Auth,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private http: HttpClient
  ) { }

  ionViewWillEnter() {
    const email = localStorage.getItem('emailForSignIn');
    if (email) {
      this.authForm.get('email').setValue(email);
    }

    if (this.mode === undefined) {
      this.mode = this.detectMode();
    }

    if (this.route.snapshot.queryParams.mode === 'verifyEmail') {
      this.verifyEmail(this.route.snapshot.queryParams.oobCode);
    }
  }

  async submit() {
    switch (this.mode) {
      case Modes.FinishSignUp:
        this.completeSignUp();
        break;
      case Modes.SignIn:
        this.signIn();
        break;
      case Modes.ResetPassword:
        this.resetPassword();
        break;
      case Modes.ForgotPassword:
        this.sendPasswordReset();
        break;
      case Modes.SignUp:
        this.sendMagicLink();
        break;
      case Modes.ConfirmEmail:
        this.validateMagicLink();
    }
  }

  async signIn() {
    const loading = await this.loadingController.create();
    await loading.present();

    try {
      await signInWithEmailAndPassword(this.afAuth, this.authForm.value.email, this.authForm.value.password);
      await this.exit(true);
    } catch (err) {
      this.showError(`Invalid login, please verify and try again.`);
    } finally {
      await loading.dismiss();
    }
  }

  async sendPasswordReset() {
    if (!this.authForm.value.email) {
      return;
    }
    const loading = await this.loadingController.create();
    await loading.present();

    try {
      await sendPasswordResetEmail(this.afAuth, this.authForm.value.email);
      await this.showError(`Password reset has been sent. Please check your email for instructions.`);
    } catch (err) {
      await this.showError(`Account not found, please verify an account with that email exists and try again.`);
    } finally {
      await loading.dismiss();
    }
  }

  async completeSignUp() {
    if (this.authForm.invalid || this.signUpForm.invalid) {
      this.showError(`Please ensure all fields are valid to proceed`);
      return;
    }

    const loading = await this.loadingController.create();
    await loading.present();

    let user;
    try {
      user = await this.afAuth.currentUser;
      await updatePassword(user, this.authForm.value.password);
    } catch (err) {
      await this.showError(`Unable to update your password.`);
      await loading.dismiss();
      return;
    }

    const displayName = this.signUpForm.value.firstName + ' ' + this.signUpForm.value.lastName;
    const photoURL = await this.getGravatarURL(user.email);
    await updateProfile(user, { displayName, photoURL });
    await loading.dismiss();
    await this.exit(true);
  }

  async validateMagicLink() {
    if (this.authForm.get('email').invalid) {
      return;
    }

    const loading = await this.loadingController.create();
    await loading.present();

    localStorage.removeItem('emailForSignIn');

    let reply: UserCredential;
    try {
      reply = await signInWithEmailLink(this.afAuth, this.authForm.value.email);
    } catch (err) {
      await loading.dismiss();
      await this.showError(`The email address entered does not match or the verification link has expired.`);
      return;
    }

    if (getAdditionalUserInfo(reply).isNewUser) {
      this.mode = Modes.FinishSignUp;
      this.authForm.get('email').disable();
    } else {
      await this.exit(false);
    }

    await loading.dismiss();
  }

  async sendMagicLink() {
    if (this.authForm.get('email').invalid) {
      return;
    }

    const loading = await this.loadingController.create();
    await loading.present();

    try {
      await signInWithEmailLink(this.afAuth, this.authForm.value.email, this.getRedirectUrl());
      await loading.dismiss();
    } catch (err) {
      await loading.dismiss();
      await this.showError(`Unable to register an account. Please verify you are not already registered and the email address is valid then try again.`);
      return;
    }

    localStorage.setItem('emailForSignIn', this.authForm.value.email);
    this.router.navigate(['/check-email']);
  }

  async cancelSignUp() {
    try {
      (await this.afAuth.currentUser).delete();
    } catch (err) { }
    await this.exit(false);
  }

  loginWithGoogle() {
    const provider = new OAuthProvider('google.com');
    provider.setCustomParameters({ prompt: 'select_account' });
    this.loginWithPopup(provider);
  }

  loginWithApple() {
    const provider = new OAuthProvider('apple.com');
    this.loginWithPopup(provider);
  }

  async exit(success = true) {
    this.mode = Modes.Redirecting;
    const user = await this.afAuth.currentUser;

    if (success) {
      if (this.route.snapshot.queryParams.continueUrl) {
        const source = this.route.snapshot.queryParams.continueUrl.match(/source=(\w+)/)

        if (source && source === 'extension') {
          this.showExtensionNotice();
          return;
        }
      }

      this.router.navigateByUrl(this.getRedirectUrl());  
    } else {
      this.router.navigate(['/']);
    }
  }

  async resetPassword() {
    if (!this.authForm.value.password) {
      this.showError(`Password must be at least 6 characters in length`);
      return;
    }

    const loading = await this.loadingController.create();
    await loading.present();

    try {
      await confirmPasswordReset(this.afAuth, this.route.snapshot.queryParams.oobCode, this.authForm.value.password);
      await this.showError(`Password reset was successful`);
      this.mode = Modes.SignIn;
    } catch (err) {
      await this.showError(`Unable to reset your password. Please ensure the reset password link is valid and try again.`);
    } finally {
      await loading.dismiss();
    }
  }

  private async loginWithPopup(provider: AuthProvider) {
    const loading = await this.loadingController.create();
    await loading.present();

    signInWithPopup(this.afAuth, provider).then(
      async reply => {
        await loading.dismiss();
        await this.exit(true);
      },
      async error => {
        await loading.dismiss();

        if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
          await this.loginWithRedirect(provider);
          return;
        }

        await this.showError(`Unable to login, please verify your credentials and try again.`);
      }
    );
  }

  private async loginWithRedirect(provider: AuthProvider) {
    try {
      localStorage.setItem('redirectUrl', this.getRedirectUrl());
      await signInWithRedirect(this.afAuth, provider);
    } catch (err) {
      await this.showError(`Unable to login, please verify your credentials and try again.`);
    }
  }

  private detectMode() {
    switch (this.router.url.split('?')[0]) {
      case '/sign-out':
        signOut(this.afAuth);
        return Modes.SignIn;
      case '/sign-up':
        return Modes.SignUp;
      case '/forgot-password':
        return Modes.ForgotPassword;
      case '/auth/continue':
        const mode = this.route.snapshot.queryParams.mode;
        switch (mode) {
          case 'resetPassword':
            return Modes.ResetPassword;
          case 'signIn':
            this.validateMagicLink();
            return localStorage.getItem('emailForSignUp') ? Modes.SignUp : Modes.ConfirmEmail;
          default:
            return Modes.SignIn;
        }
      case '/check-email':
        return Modes.WaitingForVerification;
      default:
        return Modes.SignIn;
    }
  }

  private async verifyEmail(code) {
    const loading = await this.loadingController.create();
    await loading.present();

    try {
      await applyActionCode(this.afAuth, code);
      await this.showError(`Your email address has been verified`);
    } catch (err) {
      this.showError(`Unable to complete email verification. Please ensure a valid link is used and try again.`);
    } finally {
      await loading.dismiss();
    }
  }

  private async getGravatarURL(email: string) {
    const fragments = email.trim().toLowerCase().split('@');
    const mailbox = fragments[0].split('+')[0];
    email = `${mailbox}@${fragments[1]}`;
    const url = `https://www.gravatar.com/avatar/${md5(email)}?d=404`;
    try {
      await this.http.head(url).toPromise();
      return url;
    } catch (err) {
      return undefined;
    }
  }

  private getRedirectUrl() {
    return this.route.snapshot.params.redirectTo || '/search';
  }

  private async showExtensionNotice() {
    await (await this.alertController.create({
      buttons: ['Dismiss'],
      header: `Thank you for activating your account`,
      message: `You can now sign in and resume your project in Photos for macOS.`
    })).present();
  }

  async showError(message: string) {
    const toast = await this.toastController.create({
      duration: 5000,
      buttons: [{ text: `Dismiss` }],
      message
    });
    await toast.present();
  }
}
