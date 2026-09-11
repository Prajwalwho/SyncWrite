# Plain Text Editor Client

This is a minimal plain text editor client that allows you to create, view, and edit documents.

## Running the client

1.  Navigate to the `Client` directory.
2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Start the development server:

    ```bash
    npm run dev
    ```

    The application will be available at the default Vite port (usually `http://localhost:5173`).

## API URL

The client expects the `VITE_API_URL` environment variable to be set to the base URL of the backend API. This can be done by creating a `.env.local` file in the `Client` directory with the following content:

```
VITE_API_URL=http://localhost:3000
```