let db;

initSqlJs({ locateFile: filename => filename }).then(SQL => {
  fetch("foods_us.db")
    .then(res => res.arrayBuffer())
    .then(buffer => {
      db = new SQL.Database(new Uint8Array(buffer));
      console.log("Database loaded.");
    });
});

async function searchFood() {
  const query = document.getElementById('searchInput').value.trim();
  const resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = '';

  if (!db) {
    resultsContainer.innerText = 'Database not loaded.';
    return;
  }

  const stmt = db.prepare("SELECT * FROM foods WHERE product_name LIKE ? LIMIT 10");
  const results = [];

  stmt.bind([`%${query}%`]);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();

  if (results.length === 0) {
    resultsContainer.innerText = 'No results found.';
    return;
  }

  // Process results asynchronously
  for (const item of results) {
    const div = document.createElement('div');
    div.className = 'food-item';
    
    // Get and clean the barcode
    let barcode = item.code || '';
    barcode = barcode.toString().trim().replace(/\D/g, '');
    
    // Create image container with loading spinner
    const imgContainer = document.createElement('div');
    imgContainer.className = 'food-image-container';
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    imgContainer.appendChild(spinner);
    
    div.appendChild(imgContainer);
    
    // Product info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'food-info';
    infoDiv.innerHTML = `
      <strong>${item.product_name}</strong><br>
      Brand: ${item.brands || 'Unknown'}<br>
      Barcode: ${barcode || 'N/A'}<br>
      NOVA Group: ${item.nova_group || 'Unknown'}<br>
      Sugar: ${item.sugars || 'N/A'} g<br>
      Salt: ${item.salt || 'N/A'} g<br>
      Fat: ${item.fat || 'N/A'} g<br>
      Carbs: ${item.carbohydrates || 'N/A'} g<br>
      Proteins: ${item.proteins || 'N/A'} g<br>
      Calories: ${item.energy_kcal || 'N/A'} kcal<br>
      Ingredients: ${item.ingredients_text || 'Not listed'}<br>
    `;
    
    div.appendChild(infoDiv);
    resultsContainer.appendChild(div);
    
    // Fetch image data from API
    if (barcode.length >= 8) {
      try {
        const imageUrl = await fetchImageFromAPI(barcode);
        if (imageUrl) {
          const img = document.createElement('img');
          img.className = 'food-image';
          img.src = imageUrl;
          img.onerror = () => img.replaceWith(getPlaceholderImage());
          imgContainer.replaceChild(img, spinner);
        } else {
          imgContainer.replaceChild(getPlaceholderImage(), spinner);
        }
      } catch (error) {
        console.error('Error fetching image:', error);
        imgContainer.replaceChild(getPlaceholderImage(), spinner);
      }
    } else {
      imgContainer.replaceChild(getPlaceholderImage(), spinner);
    }
  }
}

async function fetchImageFromAPI(barcode) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    
    // Try different image fields in order of preference
    return data.product?.image_front_small_url || 
           data.product?.image_front_url ||
           data.product?.image_url ||
           null;
  } catch (error) {
    console.error('API request failed:', error);
    return null;
  }
}

function getPlaceholderImage() {
  const placeholder = document.createElement('div');
  placeholder.className = 'placeholder-image';
  placeholder.innerHTML = 'No image available';
  return placeholder;
}