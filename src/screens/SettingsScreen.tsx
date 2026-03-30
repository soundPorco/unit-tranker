import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export function SettingsScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (!email || !password) { Alert.alert('エラー', 'メールとパスワードを入力してください'); return; }
    setSubmitting(true);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) Alert.alert('エラー', error.message);
      else Alert.alert('確認メールを送信しました', 'メールを確認してください');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('エラー', error.message);
    }
    setSubmitting(false);
  };

  const handleSignOut = async () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color="#6366f1" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>設定</Text>
      </View>

      <View style={styles.content}>
        {session ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>ログイン中</Text>
            <Text style={styles.email}>{session.user.email}</Text>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutText}>ログアウト</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {isSignUp ? 'アカウント作成' : 'ログイン'}
            </Text>
            <Text style={styles.description}>
              ログインするとデータがクラウドに保存されます
            </Text>

            <Text style={styles.label}>メールアドレス</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>パスワード</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="6文字以上"
              placeholderTextColor="#94a3b8"
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.authBtn, submitting && { opacity: 0.6 }]}
              onPress={handleAuth}
              disabled={submitting}
            >
              <Text style={styles.authBtnText}>
                {isSignUp ? 'アカウント作成' : 'ログイン'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.toggleText}>
                {isSignUp ? 'すでにアカウントをお持ちの方' : '新規アカウントを作成'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  content: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  description: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  email: { fontSize: 15, color: '#6366f1', fontWeight: '600' },
  label: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  authBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  authBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  toggleBtn: { alignItems: 'center', paddingVertical: 8 },
  toggleText: { color: '#6366f1', fontSize: 13 },
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  signOutText: { color: '#ef4444', fontWeight: '600' },
});
