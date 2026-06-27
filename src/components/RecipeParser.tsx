import React, { useState } from 'react';

const RecipeParser = () => {
  const [recipeText, setRecipeText] = useState('');
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    setIsLoading(true);
    setError(null);
    setParsedData(null);

    try {
      const response = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipeText }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // The API returned an error.
        throw new Error(result.error || 'Failed to parse recipe.');
      }

      setParsedData(result.data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Recipe Parser</h2>
      <textarea
        value={recipeText}
        onChange={(e) => setRecipeText(e.target.value)}
        placeholder="Paste your recipe text here..."
        rows={10}
        style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        disabled={isLoading}
      />
      <br />
      <button onClick={handleParse} disabled={isLoading} style={{ marginTop: '10px' }}>
        {isLoading ? 'Parsing...' : 'Parse Recipe'}
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: '10px', border: '1px solid red', padding: '10px', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {parsedData && (
        <div style={{ marginTop: '20px' }}>
          <h3>Parsed Recipe:</h3>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>{JSON.stringify(parsedData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default RecipeParser;