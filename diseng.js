<script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Roboto', 'sans-serif'],
                    },
                    colors: {
                        m3: {
                            // Light theme tokens
                            primary: '#006C4C',
                            onPrimary: '#FFFFFF',
                            primaryContainer: '#89F8C7',
                            onPrimaryContainer: '#002114',
                            surface: '#F6FBF6',
                            surfaceVariant: '#DCE5DD',
                            onSurface: '#181D1A',
                            onSurfaceVariant: '#404943',
                            outline: '#707973',
                            // Dark theme tokens
                            darkPrimary: '#6CDBAC',
                            darkOnPrimary: '#003825',
                            darkPrimaryContainer: '#005238',
                            darkOnPrimaryContainer: '#89F8C7',
                            darkSurface: '#0F1512',
                            darkSurfaceVariant: '#404943',
                            darkOnSurface: '#E1E3DF',
                            darkOnSurfaceVariant: '#C0C9C1',
                            darkOutline: '#8A938C',
                        }
                    },
                    borderRadius: {
                        '4xl': '2rem',
                        '5xl': '2.5rem',
                    }
                }
            }
        }
    </script>
