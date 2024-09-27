# README

## Installation and Setup

To get started with the project, follow these steps:

### 1. Install Dependencies

Run the following command to install the necessary dependencies:

```bash
npm install
```

### 2. Run the Application

To start the development server, use:

```bash
npm run dev
```

## Project Structure

- **src/engine/diffeq.js**  
  This file contains all the code required to run the differential equations (diffeqJs). It also includes a mockup of the Pinia store parameters used for compiling the models.

- **src/engine/model2.json**
- **src/engine/model4.json**  
  These files are Myokit-exported MMT files, converted to JSON strings for use with diffeqJs.

- **src/App.vue**  
  This is the main component that interacts with `diffeq.js`. It features buttons to execute the functions for `model2` and `model4`, as well as the parameters necessary for `solve` these models.
