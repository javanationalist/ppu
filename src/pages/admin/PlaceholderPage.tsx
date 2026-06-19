export const PlaceholderPage = ({ title }: { title: string }) => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
      <div className="bg-white rounded-lg shadow p-6 border-2 border-dashed border-gray-300 text-center">
        <p className="text-gray-500">Halaman {title} akan ditampilkan di sini.</p>
      </div>
    </div>
  );
};
