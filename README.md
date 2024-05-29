# GoogleScript Raytracer
> A 3d raytracer, made in Google Sheets.

Google Sheets (and many other Google services) has a built-in language called Google Script, which is just javascript but with integrated services for connecting to Google products.
I used this to make a raytracing engine in Google Sheets. This was made as a proof of concept when I was in high school, and will not be updated.

### How it works
Since you can change both the size and background colors of each cell in GS, you can easily make a resizable display. This is how the engine works; it takes input from a side menu to know what to render, processes the pixels,
and "draws" it to the screen by changing the background color of the cells.

### Features
The editor allows you to make a variety of primitive shapes, as well as changing color and material types. Some of the working material types are diffuse, mirror, hole, and glossy. Shapes can be moved and scaled, but not rotated.

Since adding the ability to import 3d models was well beyond the scope of this project, I decided to go with a "hole" method to make more complex shapes. Shapes with the "hole" material will cut through other shapes, allowing for more complex behavior.

Glossy and mirror materials can be reflective but cannot reflect light into dark areas to illuminate them. Shadows are also slightly fuzzy around the edges to mimic an atmosphere.

A scene made of objects with materials, camera and light position info, and more can be saved to the document. This allows them to be loaded into memory at a later time.

There are currently 4 rendering modes, Primary, MSAA, Multithreaded, and Multi MSAA. Primary renders each pixel in sequence. MSAA does the same as primary but uses multiple rays for each pixel to act as anti-aliasing. 
Multithreaded splits the image into 49 separate threads and renders them all together. Multi MSAA renders with MSAA and on multiple threads. The reason for the 49 threads is that google allows you to have a maximum of 50 threads at the same time,
so 49 are used for rendering and 1 for higher-level work.

#### Example of MSAA

![MSAA example](https://github.com/RemRemEgg/gs_raytracer/blob/main/images/aa.png?raw=true)


### Pictures

![4.2](https://github.com/RemRemEgg/gs_raytracer/blob/main/images/4.2.png?raw=true)

![4.3](https://github.com/RemRemEgg/gs_raytracer/blob/main/images/4.3.png?raw=true)

![4.4](https://github.com/RemRemEgg/gs_raytracer/blob/main/images/4.4.png?raw=true)

![sus](https://github.com/RemRemEgg/gs_raytracer/blob/main/images/sus.png?raw=true)


### Notes
The project is open at [this link](https://docs.google.com/spreadsheets/d/1ClkbojsvQ1bFL30ACCArCdO8WA5KplhBReCRxTEm01E/edit#gid=0), however, I can't let anyone edit the document. You can clone the document if you want to mess around with it.
