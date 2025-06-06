import React from 'react';
import { SaidaOperacionalForm } from '../components/SaidasOperacionais/SaidaOperacionalForm';

function SaidasOperacionais() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Saídas Operacionais</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <SaidaOperacionalForm />
      </div>
    </div>
  );
}

export default SaidasOperacionais; 