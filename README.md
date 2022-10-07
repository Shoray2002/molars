<!-- PROJECT LOGO -->
<div align="center">
  <h1>🦷 Molars 🦷</h1>
  <strong>A webapp to mold dentures and then export them as 3-D printable .stls</strong>
  <br>
  <br>
  <img alt="Open Sauced" src="https://user-images.githubusercontent.com/76423272/192600096-676f37ab-6507-4950-b88e-17b59ef3f2ee.gif" width="800px">
</div>
<br>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#how-it-works">How it works?</a></li>
    <li><a href="#functionalities">Functionalities</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#links">Useful Links</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project
Molars is a crossplatform webapp aimed to help dental professionals analyse various scanned patient cavity models and then mould them to their whims before obtaining 3-D printable .stls.

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- How it Works -->
## How it works?
The webapp works by rendering the given [models](/models) on a HTML canvas using [Three.js v75](https://github.com/mrdoob/three.js/tree/r75/). Then it allows the user to select individual teeth and then deform it to there whim using FFD. Then once the modeling is done the user can export the new configuration as .stl files.

## Functionalities
* ### Selection 
  ```
  Clicking on a tooth selects it,then clicking on one of the control points (blue) selects it which then allows easy 
  deformation using the arrows. Unselection works in a stacked manner, just double click and the app will unselect the
  last selected item, successive double clicks can be used to unselect everything
  ```
  <video src="https://user-images.githubusercontent.com/76423272/193344921-33843477-7907-45af-8bad-49f0a33f26c2.mp4"  alt="1" >

* ### Opacity
   ```
   Control the Opacity of the jaw model
   ```
   <table style="padding:10px">
  <tr>
    <td> <img src="https://user-images.githubusercontent.com/76423272/193342610-50a61d02-f590-4308-a3dd-2a313d090054.png"  alt="1" ></td>
    <td> <img src="https://user-images.githubusercontent.com/76423272/193342714-fe72fc11-eee7-4de5-ba7f-b7f1cfcfffae.png"  alt="1" ></td>
  </tr>
  </table>

 
* ### Wireframe 
   ```
   Wireframe material on the models to show the intricracies of the model geometry
   ```
   <table style="padding:10px">
  <tr>
    <td> <img src="https://user-images.githubusercontent.com/76423272/193341577-fa7ccc0b-b02a-41cb-b556-ebd962e53ab4.png"  alt="1" ></td>
    <td> <img src="https://user-images.githubusercontent.com/76423272/193342284-d2e7b195-d300-4bfe-a5d1-9f2d962faca4.png"  alt="2" ></td>
  </tr>
  </table>
  
* ### Deformation Point Multiplier 
   ```
   Changes the DPM to 2X, 3X or 4X
   ```
   <table style="padding:10px">
  <tr>
    <td> <img src="https://user-images.githubusercontent.com/76423272/193345420-fabc94ea-f6f4-4c4d-8bec-1a5314a3d74c.png"  alt="1" ></td>
    <td> <img src="https://user-images.githubusercontent.com/76423272/193345511-f3747b1d-ae50-4f04-93c5-67aaf09fe7a6.png"  alt="2" ></td>
    <td> <img src="https://user-images.githubusercontent.com/76423272/193345600-ea3933c1-2c03-4205-8d07-8d6942ff5849.png"  alt="3" ></td>
    
  </tr>
  </table>

* ### Export
  ```
   Export the modified models as .stls. Currently only exporting as base64 strings
   ```


### Built With

* Vanilla HTML+CSS+JS
* [ffd.js](https://github.com/glennchun/free-form-deformation) 
* [Three.js v75](https://github.com/mrdoob/three.js/tree/r75/)

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started
Below are the instructions on setting up this project locally.
To get a local copy up and running follow these simple example steps.

### Prerequisites
* [Live Server](https://www.youtube.com/watch?v=_wue59ldqMg) 

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/Shoray2002/molars.git
   ```
2. Start the Live Server
  
  The Project is now running locally

<p align="right">(<a href="#top">back to top</a>)</p>


<!-- LINKS -->
## Links
* [Free Functional Deform](https://github.com/glennchun/free-form-deformation) 
* [Three.js Fundamentals](https://threejs.org/manual/#en/fundamentals)

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- Contributing -->
## Contributing
```
  The code is very sphagetti at some places and missing some features. Feel free to take on any issue 
  and even create new ones for things you consider this project lacks. Check out the links above if 
  you want a brief overview of tech used here and don't hesitate to ping me in case you get stuck.
```  
  **Warning: There are numerous differences between Threejs v75 and [latest](https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene). So cross compatibality may be a problem at some places.**
  
  
<p align="right">(<a href="#top">back to top</a>)</p>

<!-- LICENSE -->

## License

Distributed under the MIT License. See [`LICENSE.txt`](/LICENSE.txt) for more information.

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Shoray - [@ShoraySinghal](https://twitter.com/ShoraySinghal) - shoryasinghall@gmail.com

Deployment Link: [molars](https://molars.netlify.app/)

Personal Website: [LordShorya](lordshoray.is-a.dev)

<p align="right">(<a href="#top">back to top</a>)</p>
