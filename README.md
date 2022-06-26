# Blaine's World
[Personal website of Blaine Murphy](https://blaines.world/) built using
[Jekyll](https://jekyllrb.com/) and hosted on
[Neocities](https://neocities.org/).


## Testing
You will need to [install Jekyll](https://jekyllrb.com/docs/installation/)
before you can serve the site on your local machine. Run the following to
start a local server:

```shell
$ jekyll serve
```

Open a web browser to `localhost:8000` to access the site.


## Scripts
Some shell scripts are included to ease graphics changes. These require a POSIX
compatible `sh` and graphics utilities.

### fixgif
The `fixgif` script is used to ensure a GIFs is optimized as well as looped
forever. Many older found GIFs do not loop indefinitely and some have
a weird format that trips viewer implementations up. This utility requires
[Gifsicle](https://www.lcdf.org/gifsicle/) to be installed.

```shell
$ ./_utils/fixgif static/bullet.gif
```

### vid2gif
The `vid2gif` script is used to convert a video into an animated GIF. This
utility requires [FFmpeg](https://ffmpeg.org/) to be installed.

```shell
$ ./_utils/vid2gif input.mp4 output.gif
```


## Licensing
Thematic markup, style sheets, and scripts in this repository are licensed under
the 2-clause BSD license, see `LICENSE` for details. Page content is excluded
from this license, see the Content section below.

### Fonts
The fonts "Comic Neue" and "Courier Prime" in the `static` directory are
licensed under the "SIL Open Font License", see
`static/_comic-neue-license.txt` and `static/_courier-prime-license.txt` for
details.

### Graphics
Animated GIFs and theme graphics in the `static` directory are derived from
images sourced from [GifCities](https://gifcities.org/). Due to the nature of
these graphics it is difficult to pinpoint where a file originated and/or who
the copyright owner is. If you are the owner of any of these images and have an
issue with their usage please [contact me](mailto:myself@blaines.world).

### Content
All other content in this repository should be considered site content and is
copyright Blaine Murphy. This includes markdown files and the media included by
those files. Code examples/snippets within markdown files are the exception to
this and are licensed the same as code.
