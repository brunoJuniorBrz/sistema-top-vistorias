import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const entradaEletronicaSchema = z.object({
  data: z.string(),
  operador: z.string(),
  tipo: z.enum(['pix', 'cartao', 'deposito']),
  valor: z.number().min(0.01),
});

type EntradaEletronicaFormData = z.infer<typeof entradaEletronicaSchema>;

export function EntradaEletronicaForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<EntradaEletronicaFormData>({
    resolver: zodResolver(entradaEletronicaSchema)
  });

  const onSubmit = async (data: EntradaEletronicaFormData) => {
    try {
      const response = await fetch('/api/entradas-eletronicas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar entrada eletrônica');
      }

      // Limpar formulário ou redirecionar
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="data" className="block text-sm font-medium text-gray-700">
          Data
        </label>
        <input
          type="date"
          id="data"
          {...register('data')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.data && (
          <p className="mt-1 text-sm text-red-600">{errors.data.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="operador" className="block text-sm font-medium text-gray-700">
          Operador
        </label>
        <input
          type="text"
          id="operador"
          {...register('operador')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.operador && (
          <p className="mt-1 text-sm text-red-600">{errors.operador.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">
          Tipo
        </label>
        <select
          id="tipo"
          {...register('tipo')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="pix">PIX</option>
          <option value="cartao">Cartão</option>
          <option value="deposito">Depósito</option>
        </select>
        {errors.tipo && (
          <p className="mt-1 text-sm text-red-600">{errors.tipo.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="valor" className="block text-sm font-medium text-gray-700">
          Valor
        </label>
        <input
          type="number"
          step="0.01"
          id="valor"
          {...register('valor', { valueAsNumber: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.valor && (
          <p className="mt-1 text-sm text-red-600">{errors.valor.message}</p>
        )}
      </div>

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Salvar
      </button>
    </form>
  );
} 