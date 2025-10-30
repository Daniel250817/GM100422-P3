import React, { useState, useEffect } from 'react'
import { Alert, StyleSheet, View, TextInput, TouchableOpacity, Text } from 'react-native'
import { supabase } from '../lib/supabase'
import ToastService from '../services/ToastService'

export default function SimpleSupabaseAuth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    // Debug: Verificar si las variables de entorno están cargadas
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    
    setDebugInfo(`URL: ${supabaseUrl ? '✅ Configurada' : '❌ No configurada'}\nKey: ${supabaseKey ? '✅ Configurada' : '❌ No configurada'}`)
  }, [])

  async function signInWithEmail() {
    setLoginLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })
      if (error) {
        console.log('Error en login:', error)
        ToastService.error('Error de login', error.message)
      }
    } catch (err) {
      console.log('Error inesperado en login:', err)
      ToastService.error('Error', 'Error de conexión con Supabase')
    }
    setLoginLoading(false)
  }

  async function signUpWithEmail() {
    setRegisterLoading(true)
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.signUp({
        email: email,
        password: password,
      })
      
      if (error) {
        console.log('Error en registro:', error)
        ToastService.error('Error de registro', error.message)
      } else if (!session) {
        ToastService.info('¡Por favor revisa tu email para verificar tu cuenta!')
      } else {
        ToastService.success('¡Registro exitoso!', 'Revisa tu email para verificar tu cuenta.')
      }
    } catch (err) {
      console.log('Error inesperado:', err)
      ToastService.error('Error', 'Error de conexión con Supabase')
    }
    setRegisterLoading(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TimeTrack - Supabase</Text>
      
      <Text style={styles.debugText}>{debugInfo}</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={signInWithEmail}
        disabled={loginLoading || registerLoading}
      >
        <Text style={styles.buttonText}>
          {loginLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.secondaryButton]} 
        onPress={signUpWithEmail}
        disabled={loginLoading || registerLoading}
      >
        <Text style={styles.buttonText}>
          {registerLoading ? 'Registrando...' : 'Registrarse'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#000',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugText: {
    color: '#FFD700',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
  },
})
