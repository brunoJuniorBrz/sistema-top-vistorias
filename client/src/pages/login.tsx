import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signIn(data.email, data.senha);
      navigate('/dashboard');
    } catch (error) {
      alert('Erro ao fazer login. Verifique suas credenciais.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#20446A]">
      <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-md flex flex-col items-center">
        <img src={logo} alt="Logo Top Vistorias" className="w-32 mb-4" />
        <h2 className="text-2xl font-bold text-[#20446A] text-center mb-1">TOP VISTORIAS</h2>
        <p className="text-[#20446A] text-center mb-6">Acesso ao Sistema de Caixa</p>
        <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <input
              {...register('email')}
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border border-gray-300 rounded mb-1 focus:outline-none focus:ring-2 focus:ring-[#20446A]"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div className="mb-6">
            <input
              {...register('senha')}
              type="password"
              placeholder="Senha"
              className="w-full px-4 py-2 border border-gray-300 rounded mb-1 focus:outline-none focus:ring-2 focus:ring-[#20446A]"
            />
            {errors.senha && (
              <p className="text-sm text-red-600">{errors.senha.message}</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded bg-[#F59E1B] text-white font-semibold text-lg hover:bg-[#d48817] transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;