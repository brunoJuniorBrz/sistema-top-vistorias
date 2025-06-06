import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const entradaSchema = z.object({
  data: z.string(),
  operador: z.string(),
  carro: z.number().optional(),
  moto: z.number().optional(),
  caminhonete: z.number().optional(),
  caminhao: z.number().optional(),
  revistoriaDetran: z.number().optional(),
  revistoriaLoja: z.number().optional(),
  cautelar: z.number().optional(),
  pesquisa: z.number().optional(),
});

type EntradaFormData = z.infer<typeof entradaSchema>;

export function EntradaForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<EntradaFormData>({
    resolver: zodResolver(entradaSchema)
  });

  const onSubmit = async (data: EntradaFormData) => {
    try {
      const response = await fetch('/api/entradas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar entrada');
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="carro" className="block text-sm font-medium text-gray-700">
            Carro
          </label>
          <input
            type="number"
            id="carro"
            {...register('carro', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="moto" className="block text-sm font-medium text-gray-700">
            Moto
          </label>
          <input
            type="number"
            id="moto"
            {...register('moto', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
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