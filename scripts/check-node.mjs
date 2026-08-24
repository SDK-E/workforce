const [major,minor]=process.versions.node.split(".").map(Number);
if(major<22||(major===22&&minor<13)||major>=27){
  console.error(`Unsupported Node.js ${process.versions.node}. Workforce requires Node.js >=22.13 and <27.`);
  process.exit(1);
}
