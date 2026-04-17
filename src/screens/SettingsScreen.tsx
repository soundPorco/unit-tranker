import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export function SettingsScreen() {
  const [session, setSession]       = useState<Session | null>(null);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSignUp, setIsSignUp]     = useState(false);

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

  const handleSignOut = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator color="#3eb370" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* 近日公開バナー */}
        <View style={s.comingSoonCard}>
          <Ionicons name="time-outline" size={28} color="#8E8E93" />
          <Text style={s.comingSoonTitle}>近日公開予定</Text>
          <Text style={s.comingSoonDesc}>
            クラウド同期機能は現在準備中です。{'\n'}もうしばらくお待ちください。
          </Text>
        </View>

        {/* 以下、機能実装時に有効化 (コードは保持) */}
        <View style={s.disabledOverlay} pointerEvents="none">
          {session ? (
            <>
              {/* アカウント情報 */}
              <Text style={s.sectionLabel}>アカウント</Text>
              <View style={s.card}>
                <View style={s.accountRow}>
                  <View style={s.avatarCircle}>
                    <Ionicons name="person" size={22} color="#FFFFFF" />
                  </View>
                  <View style={s.accountInfo}>
                    <Text style={s.accountEmail}>{session.user.email}</Text>
                    <Text style={s.accountSub}>ログイン中</Text>
                  </View>
                </View>
              </View>

              {/* アクション */}
              <Text style={s.sectionLabel}>アカウント操作</Text>
              <View style={s.card}>
                <TouchableOpacity style={s.dangerRow} onPress={handleSignOut}>
                  <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
                  <Text style={s.dangerText}>ログアウト</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* 未ログイン状態の説明 */}
              <View style={s.infoCard}>
                <Ionicons name="cloud-outline" size={32} color="#3eb370" />
                <Text style={s.infoTitle}>クラウドにデータを保存</Text>
                <Text style={s.infoDesc}>
                  ログインすると複数端末でデータを同期できます。{'\n'}未ログインでもアプリを利用できます。
                </Text>
              </View>

              {/* フォーム */}
              <Text style={s.sectionLabel}>
                {isSignUp ? 'アカウント作成' : 'ログイン'}
              </Text>
              <View style={s.card}>
                <View style={s.formRow}>
                  <Text style={s.formLabel}>メールアドレス</Text>
                  <TextInput
                    style={s.formInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="example@email.com"
                    placeholderTextColor="#C7C7CC"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={s.divider} />
                <View style={s.formRow}>
                  <Text style={s.formLabel}>パスワード</Text>
                  <TextInput
                    style={s.formInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="6文字以上"
                    placeholderTextColor="#C7C7CC"
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[s.authBtn, submitting && { opacity: 0.5 }]}
                onPress={handleAuth}
                disabled={submitting}
              >
                <Text style={s.authBtnText}>
                  {isSignUp ? 'アカウントを作成' : 'ログイン'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.toggleBtn} onPress={() => setIsSignUp(v => !v)}>
                <Text style={s.toggleText}>
                  {isSignUp ? 'すでにアカウントをお持ちの方' : '新規アカウントを作成'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  scroll: { padding: 16, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6C6C70',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginLeft: 4,
    marginTop: 8,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
    marginBottom: 4,
  },

  divider: { height: 0.5, backgroundColor: '#E5E5EA' },

  // ログイン済みアカウント行
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#3eb370',
    alignItems: 'center', justifyContent: 'center',
  },
  accountInfo: { flex: 1 },
  accountEmail: { fontSize: 15, fontWeight: '500', color: '#1C1C1E' },
  accountSub:   { fontSize: 12, color: '#8E8E93', marginTop: 2 },

  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  dangerText: { fontSize: 15, color: '#FF3B30', fontWeight: '500' },

  // 未ログイン説明カード
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  infoTitle: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  infoDesc:  { fontSize: 13, color: '#8E8E93', textAlign: 'center', lineHeight: 19 },

  // フォーム行
  formRow: {
    paddingVertical: 12,
    gap: 4,
  },
  formLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  formInput: {
    fontSize: 15,
    color: '#1C1C1E',
    paddingVertical: 2,
  },

  authBtn: {
    backgroundColor: '#3eb370',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  authBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  toggleBtn: { alignItems: 'center', paddingVertical: 12 },
  toggleText: { fontSize: 14, color: '#3eb370' },

  // 近日公開バナー
  comingSoonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  comingSoonTitle: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  comingSoonDesc:  { fontSize: 13, color: '#8E8E93', textAlign: 'center', lineHeight: 19 },

  // 無効化オーバーレイ
  disabledOverlay: { opacity: 0.3 },
});
