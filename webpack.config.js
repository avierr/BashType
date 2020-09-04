const path = require('path');

module.exports = {
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'BashType',
        libraryTarget: 'var',
        libraryExport: 'default',
        umdNamedDefine: true,


    },
    devServer: {
        contentBase: path.join(__dirname, './'),
        compress: true,
        port: 9000
    }
};
