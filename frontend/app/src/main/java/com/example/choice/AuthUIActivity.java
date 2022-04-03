package com.example.choice;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.example.choice.databinding.AuthsUiLayoutBinding;

import com.firebase.ui.auth.AuthMethodPickerLayout;
import com.firebase.ui.auth.AuthUI;
import com.firebase.ui.auth.AuthUI.IdpConfig;
import com.firebase.ui.auth.ErrorCodes;
import com.firebase.ui.auth.FirebaseAuthUIActivityResultContract;
import com.firebase.ui.auth.IdpResponse;
import com.firebase.ui.auth.data.model.FirebaseAuthUIAuthenticationResult;
import com.firebase.ui.auth.util.ExtraConstants;
import com.google.android.gms.common.Scopes;
import com.google.android.material.snackbar.Snackbar;
import com.google.firebase.auth.ActionCodeSettings;
import com.google.firebase.auth.FirebaseAuth;

import java.util.ArrayList;
import java.util.List;

import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.annotation.DrawableRes;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.annotation.StyleRes;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AppCompatDelegate;

public class AuthUIActivity extends AppCompatActivity
        implements ActivityResultCallback<FirebaseAuthUIAuthenticationResult> {
    private static final String TAG = "AuthUIActivity";

    private static final String FIREBASE_TOS_URL = "https://firebase.google.com/terms/";
    private static final String FIREBASE_PRIVACY_POLICY_URL = "https://firebase.google.com/terms/analytics/#7_privacy";

    private AuthsUiLayoutBinding mBinding;

    private final ActivityResultLauncher<Intent> signIn =
            registerForActivityResult(new FirebaseAuthUIActivityResultContract(), this);

    @NonNull
    public static Intent createIntent(@NonNull Context context) {
        return new Intent(context, AuthUIActivity.class);
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mBinding = AuthsUiLayoutBinding.inflate(getLayoutInflater());
        setContentView(mBinding.getRoot());

        // Workaround for vector drawables on API 19
        AppCompatDelegate.setCompatVectorFromResourcesEnabled(true);

        mBinding.signIn.setOnClickListener(view -> signIn());

        FirebaseAuth auth = FirebaseAuth.getInstance();
        if (auth.getCurrentUser() != null) {
            redirect();
        } else {
            signIn();
        }
        //catchEmailLinkSignIn();
    }

    public void catchEmailLinkSignIn() {
        if (getIntent().getExtras() == null) {
            return;
        }
        @SuppressLint("RestrictedApi") String link = getIntent().getExtras().getString(ExtraConstants.EMAIL_LINK_SIGN_IN);
        if (link != null) {
            signInWithEmailLink(link);
        }
    }


    public void signIn() {
        signIn.launch(getSignInIntent(/*link=*/null));
    }

    public void signInWithEmailLink(@Nullable String link) {
        signIn.launch(getSignInIntent(link));
    }

    @NonNull
    public AuthUI getAuthUI() {
        AuthUI authUI = AuthUI.getInstance();

        return authUI;
    }

    private Intent getSignInIntent(@Nullable String link) {
        AuthUI.SignInIntentBuilder builder = getAuthUI().createSignInIntentBuilder()
                .setIsSmartLockEnabled(false)
                .setTheme(getSelectedTheme())
                .setLogo(getSelectedLogo())
                .setAvailableProviders(getSelectedProviders());

        if (getSelectedTosUrl() != null && getSelectedPrivacyPolicyUrl() != null) {
            builder.setTosAndPrivacyPolicyUrls(
                    getSelectedTosUrl(),
                    getSelectedPrivacyPolicyUrl());
        }

        if (link != null) {
            builder.setEmailLink(link);
        }

        FirebaseAuth auth = FirebaseAuth.getInstance();

        return builder.build();
    }

    @Override
    protected void onResume() {
        super.onResume();
        FirebaseAuth auth = FirebaseAuth.getInstance();
        if (auth.getCurrentUser() != null && getIntent().getExtras() == null) {
            startSignedInActivity(null);
            finish();
        }
    }

    private void handleSignInResponse(int resultCode, @Nullable IdpResponse response) {
        // Successfully signed in
        if (resultCode == RESULT_OK) {
            startSignedInActivity(response);
            finish();
        } else {
            // Sign in failed
            if (response == null) {
                // User pressed back button
                showSnackbar(R.string.sign_in_cancelled);
                return;
            }

            if (response.getError().getErrorCode() == ErrorCodes.NO_NETWORK) {
                showSnackbar(R.string.no_internet_connection);
                return;
            }

            if (response.getError().getErrorCode() == ErrorCodes.ERROR_USER_DISABLED) {
                showSnackbar(R.string.account_disabled);
                return;
            }

            showSnackbar(R.string.unknown_error);
            Log.e(TAG, "Sign-in error: ", response.getError());
        }
    }

    private void startSignedInActivity(@Nullable IdpResponse response) {
        redirect();
    }

    @StyleRes
    private int getSelectedTheme() {
        /*if (mBinding.greenTheme.isChecked()) {
            return R.style.GreenTheme;
        }

        if (mBinding.appTheme.isChecked()) {
            return R.style.AppTheme;
        }*/

        return AuthUI.getDefaultTheme();
    }

    @DrawableRes
    private int getSelectedLogo() {
        return R.drawable.firebase_auth_120dp;
    }

    private List<IdpConfig> getSelectedProviders() {
        List<IdpConfig> selectedProviders = new ArrayList<>();

        selectedProviders.add(
                    new IdpConfig.GoogleBuilder().build());
        selectedProviders.add(new IdpConfig.EmailBuilder()
                    .setRequireName(true)
                    .setAllowNewAccounts(true)
                    .build());

        return selectedProviders;
    }

    private String getSelectedTosUrl() {
        return FIREBASE_TOS_URL;
    }

    private String getSelectedPrivacyPolicyUrl() {
       return FIREBASE_PRIVACY_POLICY_URL;
    }

    private void showSnackbar(@StringRes int errorMessageRes) {
        Snackbar.make(mBinding.getRoot(), errorMessageRes, Snackbar.LENGTH_LONG).show();
    }

    @Override
    public void onActivityResult(@NonNull FirebaseAuthUIAuthenticationResult result) {
        // Successfully signed in
        IdpResponse response = result.getIdpResponse();
        handleSignInResponse(result.getResultCode(), response);

        redirect();
    }

    public void redirect() {
        Intent intent = new Intent(this,   redirect.class);
        startActivity(intent);
    }
}
