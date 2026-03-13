export default function Spinner({ size = 'md', center = false }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

  const spinner = (
    <div
      className={`${sizes[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}
    />
  );

  if (center) {
    return (
      <div className="flex items-center justify-center py-12">
        {spinner}
      </div>
    );
  }

  return spinner;
}
