import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const aReceberSchema = z.object({
  data: z.string(),
  operador: z.string(),
  nome: z.string(),
  placa: z.string(),
  valor: z.number().min(0.01),
  pago: z.boolean().default(false),
});

type AReceberFormData = z.infer<typeof aReceberSchema>;

export function AReceberForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<AReceberFormData>({
    resolver: zodResolver(aReceberSchema)
  });

  const onSubmit = async (data: AReceberFormData) => {
    try {
      const response = await fetch('/api/a-receber', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar registro a receber');
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
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
          Nome
        </label>
        <input
          type="text"
          id="nome"
          {...register('nome')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.nome && (
          <p className="mt-1 text-sm text-red-600">{errors.nome.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="placa" className="block text-sm font-medium text-gray-700">
          Placa
        </label>
        <input
          type="text"
          id="placa"
          {...register('placa')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.placa && (
          <p className="mt-1 text-sm text-red-600">{errors.placa.message}</p>
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

      <div className="flex items-center">
        <input
          type="checkbox"
          id="pago"
          {...register('pago')}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="pago" className="ml-2 block text-sm text-gray-900">
          Pago
        </label>
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