package com.example.choice;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.firebase.ui.auth.IdpResponse;
import com.firebase.ui.auth.util.ExtraConstants;

public class HomePage extends AppCompatActivity {
    @SuppressLint("RestrictedApi")
    @NonNull
    public static Intent createIntent(@NonNull Context context, @Nullable IdpResponse response) {
        return new Intent().setClass(context, HomePage.class)
                .putExtra(ExtraConstants.IDP_RESPONSE, response);
    }
}
