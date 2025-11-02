const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = 7000;
const recipesFile = 'recipes.json';

// Create the server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Serve HTML file for root path
    if (req.method === 'GET' && pathname === '/') {
        serveHtml(res);
        return;
    }
    
    // Serve CSS file
    if (req.method === 'GET' && pathname === '/style.css') {
        serveCss(res);
        return;
    }

    // CORS headers for API endpoints
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API routes
    if (req.method === 'GET' && pathname === '/recipes') {
        getRecipes(req, res);
    } 
    else if (req.method === 'POST' && pathname === '/recipes') {
        addRecipe(req, res);
    }
    else if (req.method === 'PUT' && pathname.startsWith('/recipes/')) {
        updateRecipe(req, res);
    }
    else if (req.method === 'DELETE' && pathname.startsWith('/recipes/')) {
        deleteRecipe(req, res);
    }
    else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
});

// Serve HTML file
function serveHtml(res) {
    fs.readFile('index.html', (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
}

// Serve CSS file
function serveCss(res) {
    fs.readFile('style.css', (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('CSS not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end(data);
    });
}

// Get all recipes
function getRecipes(req, res) {
    fs.readFile(recipesFile, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Create empty file if it doesn't exist
                fs.writeFile(recipesFile, JSON.stringify([]), (err) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Cannot create recipes file' }));
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify([]));
                });
                return;
            }
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Cannot read recipes' }));
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
    });
}

// Add a new recipe
function addRecipe(req, res) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const newRecipe = JSON.parse(body);
            if (!newRecipe.name || !newRecipe.ingredients) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Name and ingredients are required' }));
                return;
            }
            
            newRecipe.id = Date.now().toString();
            
            fs.readFile(recipesFile, 'utf8', (err, data) => {
                let recipes = [];
                
                if (!err && data) {
                    try {
                        recipes = JSON.parse(data);
                    } catch (parseError) {
                        recipes = [];
                    }
                }
                
                recipes.push(newRecipe);
                
                fs.writeFile(recipesFile, JSON.stringify(recipes, null, 2), (err) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Cannot save recipe' }));
                        return;
                    }
                    
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(newRecipe));
                });
            });
        } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON format' }));
        }
    });
}

// Update a recipe
function updateRecipe(req, res) {
    const id = req.url.split('/')[2];
    
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const updatedRecipe = JSON.parse(body);
            
            fs.readFile(recipesFile, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Cannot read recipes' }));
                    return;
                }
                
                let recipes;
                try {
                    recipes = JSON.parse(data);
                } catch (parseError) {
                    recipes = [];
                }
                
                let found = false;
                
                for (let i = 0; i < recipes.length; i++) {
                    if (recipes[i].id === id) {
                        updatedRecipe.id = id;
                        recipes[i] = updatedRecipe;
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Recipe not found' }));
                    return;
                }
                
                fs.writeFile(recipesFile, JSON.stringify(recipes, null, 2), (err) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Cannot update recipe' }));
                        return;
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(updatedRecipe));
                });
            });
        } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON format' }));
        }
    });
}

// Delete a recipe
function deleteRecipe(req, res) {
    const id = req.url.split('/')[2];
    
    fs.readFile(recipesFile, 'utf8', (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Cannot read recipes' }));
            return;
        }
        
        let recipes;
        try {
            recipes = JSON.parse(data);
        } catch (parseError) {
            recipes = [];
        }
        
        let foundIndex = -1;
        
        for (let i = 0; i < recipes.length; i++) {
            if (recipes[i].id === id) {
                foundIndex = i;
                break;
            }
        }
        
        if (foundIndex === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Recipe not found' }));
            return;
        }
        
        const deletedRecipe = recipes.splice(foundIndex, 1)[0];
        
        fs.writeFile(recipesFile, JSON.stringify(recipes, null, 2), (err) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Cannot delete recipe' }));
                return;
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Recipe deleted', recipe: deletedRecipe }));
        });
    });
}

// Start the server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`API endpoints:`);
    console.log(`  GET    /recipes`);
    console.log(`  POST   /recipes`);
    console.log(`  PUT    /recipes/:id`);
    console.log(`  DELETE /recipes/:id`);
});
