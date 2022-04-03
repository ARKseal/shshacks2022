package com.example.choice;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.os.Bundle;

import com.firebase.ui.auth.AuthUI;
import com.firebase.ui.auth.util.ExtraConstants;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    //private ActivityChooserBinding mBinding;

    @SuppressLint("RestrictedApi")
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (AuthUI.canHandleIntent(getIntent())) {
            Intent intent = new Intent(MainActivity.this, AuthUIActivity.class);
            intent.putExtra(ExtraConstants.EMAIL_LINK_SIGN_IN, getIntent().getData().toString());
            startActivity(intent);
            finish();
            return;
        }
    }
}
