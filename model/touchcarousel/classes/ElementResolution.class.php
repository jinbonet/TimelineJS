<?php
class Taogi_ElementResolution {
	var $x;
	var $y;
	var $x_m = 12;
	var $y_m = 24;

	function Taogi_ElementResolution() {
		$media = "<script>document.write(screen.height); </script>";
		if($media <= 768) {
			$this->x = 144;
			$this->y = 168;
			$this->x_m = 12;
			$this->y_m = 24;
		} else {
			$this->x = 216;
			$this->y = 252;
			$this->x_m = 8;
			$this->y_m = 16;
		}
	}

	function getElementSizeByClass($class) {
		$v = (int)(substr($x_class,7,1));
		if(!$v) $v = 1;
		$width = ($this->x * $v)+($x_m * max(0,$v-1));
		$h = (int)(substr($x_class,8,1));
		if(!$h) $h = 1;
		$height = ($this->y * $h)+($y_m * max(0,$h-1));

		return array($width,$height);
	}

	function getElementSizeTag($class) {
		$size = $this->getElementSizeByClass($class);
		return ' width="'.$size[0].'" height="'.$size[1].'"';
	}
}
?>
