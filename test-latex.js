const React = require('react');
const ReactDOMServer = require('react-dom/server');
const Latex = require('react-latex-next').default || require('react-latex-next');

const element = React.createElement(Latex, null, "The perimeter of an equilateral triangle of side $5\\text{ cm}$ is:");
console.log(ReactDOMServer.renderToString(element));
