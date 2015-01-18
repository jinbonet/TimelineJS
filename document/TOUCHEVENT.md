Swipe 터치 이벤트 핸들링
========================

1. LEFT / RIGHT
========================
------------------------


2. UP / DOWN
========================
------------------------

따오기는 각 Article마다 크게 두개의 모드가 있다. Featured 모드와 Gallery 모드. Featured는 대표이미지(media)/제목(headline)/내용(text)으로 구성되어 있다. Gallery는 이 Article을 설명하는 다양한 멀티미디어들의 Gallery이다.
UP / DOWN Swipe은 기본적으로 이 두개의 모드간를 flip 형태로 전환시켜주는 Swipe Event이다.

1. 변수:
--------
* this.scrollContainerPos :
  * 570px 이하에서는 하단 navigation 바가 숨겨져 있다. 이때 position absolute, bottom: xxxpx 값으로 숨겨져 있음.
  * 이 값이 0 또는 null 이 아니면 570px 환경에서 숨겨져 있는 환경. 당연히 - 값.

* this._pageScroll :
  * UP/DOWN Swipe를 모드 전환이 아니라, 실제 스크롤 모드로 사용할지 여부 결정.
  * Featured의 text가 전체 화면 크기를 넘어가면 모드전환용이 아니라 실제 페이지 스크롤 이벤트로 사용한다.
  * 처음 로딩할때나 window resize 이벤트가 일어날때마다, 계산.
  * 화면크기가 넘어가는 Article이 없더라도 Window Height가 570px 이하인 환경에서는 무조건 페이스 스크롤 모드 On(1) -> 구현해야
    * 570px 이하에서는 하단 navigation 바가 숨겨져 있다. 따라서 PageScroll로 navigation에 접근할 수 있어야 하기 때문에..
	* this.scrollContainerPos 값이 있는 경우
  * 0: 모드전환, 1: 페이스 스크롤

* this.items[i].pageScroll :
  * 각 Article 마다 실제 페이지스크롤 여부 체크.
  * 각 Article마다 Featured의 text가 전체 화면 크기를 넘어가, 페이지 스크롤을 해야 하는지 여부를 일일이 표시.
  * this.items[i].height : 화면크기에 따라 배정받는 display height
  * this.items[i].wheight : 실제 내용이 담겨있는 container box( 실제로는 .wrap)의 실제 height
    * (wheight > height) ? true : false;
  * 처음 로딩할때나 window resize 이벤트가 일어날때마다, 각각 계산.
  * false: 페이지스크롤 없음, true: 페이지스크롤 있음.
  * 각 Article마다 체크하는 이유는 Swipe Event 처리할때 연산 속도를 높이기 위해. 필요없으면 아무것도 안하면 되니까.

* this._isPageScrollSwipping :
  * 현재 Up/Down Event로 PageScroll이 일어나고 있는 상태 여부를 표시.
  * Page Scroll Event가 현재 진행중이고 연산을 처리중이니 다른 이벤트는 간섭하지 말도록 lock을 걸기 위해.
  * false: PageScrolling 하고 있지 않음, true: 현재 PageScrolling중

* this._isSliderSwipping :
  * 현재 left/right Event로 article간 슬라이딩 프로세스가 진행여부인지 체크
  * 현재 SlideSwipe 중이라면 Up/Down으로 모드 전환이 일어나는 Event와 충돌나지 않아야 하기 때문에. 반드시 체크
  * false: SlideSwipe 하고 있지 않음, true: 현재 SlideSwipe중

* this._isIndicateSwipping :
  * 현재 Up/Down Event로 PageScroll 중 숨겨진 네비게이션바가 sliding 중인지 표시
  * this.scrollContainerPos 가 있다면 네비게이션바가 숨겨져 있는 상태. 이때 전체 layout container를 움직여 네이베이션바를 보여주거나 다시 숨긴다.
  * 이 때 전체 container가 Up/Down이 일어나고 있음을 event buffer 변수에 지정
  * true , false

2. Up / Down 이벤트 처리과정
----------------------------

1) SwipeStart
touch 이벤트가 발생할때 수행되는 일련의 프로세스들

                    touch가 일어난 위치가 click 이벤트로 정의된 곳?
					                       |
                                     NO    |  YES
                      +--------------------+-----------+
					  |                                |
                      |                 겔러리 Mode에서 thumbnail 이미지를 클릭한 것인가?
                      |                                |
                      |                          NO    |   YES
                      |                       +--------+-----------+
                      |                       |                    |
                      |                       |           slide gallery to target multimedia
                      |                       |
                      |             touch 이벤트가 아닌 원래 정의된 event(ex: <a href></a>) 실행
                      |
                      |
  이전에 touchswipe Event에 의해 진행중인 프로세스가 있으면 강제로 종료
                      |
         this._pageScroll == 1 ? (이 페이지는 up/down swipe을 모드전환이 아닌 페이지 스크롤로 처리해야 하는가)
                      |
                      |     YES
                      +----------------------+
                                             |
                         jQuery(event.target).closest('.touchcarousel-item')
                         (touch 이벤트가 따오기 타임라인 영역에서 발생한 것인가. 전혀 상관없는 영역에서 touch 이벤트가 발생할 수도 있기 때문)
                                             |
                                             |   YES
                                             +-----------+
                                                         |
                         this.items[i].pageScroll == true || his.scrollContainerPos
                      ( touch가 일어난 영역이 실제 page scroll 필요한 Article 영역인가
                        또는 네비게이션이 숨겨진 상태인 화면인가 )
                                                         |
                                                         |   YES
                                                         +-----------+
                                                                     |
                                                   this._startYPos = this.items[i].curScrollY; (현재 article의 page scroll 위치 값(- 값) 지정)
												   this._isPageScrollSwipping = true; (pageScrolling이 시작됐음을 buffer 변수에 저장)


2) SwipeMove
touce가 상/하로 이동중인 상태(swipe)일때 수행되는 프로세스들

          this._isPageScrollSwipping == true ? (pageScrolling 이벤트가 진행중인가?)
                          |
                          |  YES
                          +-----------+
                                      |
                                  Up? vs Down ?
                                  UP  |  Down
                        +-------------+-------------------------------+
                        |                                             |
               possible scroll up ?                             navigation show ?
                        |                                 (this.scrollContainerPos &&
                  NO    |   YES                           && this.scrollContainer.data('show') == 1)             
             +----------+---------+                                    |
             |                    |                                    |
             |              dist = this._startYPos - distance          |
             |                    |                                    |
             |              this.setYScrollPosition                    |
             |                                                         |
    navigation hide ?                                                  |
  (this.scrollContainerPos                                             |
  && this.scrollContainer.data('show') == 0)                           |                                      |
             |                                                         |
             |   YES                                              NO   |   YES
             +----------+                                  +-----------+-----------+
                        |                                  |                       |
              this._showIndicate(1)             possible scroll Down ?      this._showIndicate(0)
                                                           |
                                                           |   YES
                                                           +---------+
                                                                     |
                                                      dist = this._startYPos + distance
                                                                     |
                                          this.setYScrollPosition(this.items[i],dist,0,'linear');

3) SwipeEnd
touch swipe 이벤트가 종료될 때 수행될 프로세스

              this._isSliderSwipping != true && this._pageScroll == 0
  (Article간 슬라이드 이동중도 아니고 pageScroll이 발생하지 않는 화면크기인 경우)
                                    |
                               NO   |  YES
                        +-----------+-----------+
                        |                       |
                        |                Mode 상호 전환 (Featured <-> Gallery)
                        |                       +- this.switchGallery
                        |                       +- this._initGallery
                        |
       this._isPageScrollSwipping == true
  (실제 pageScroll 이벤트가 일어난 것인지 체크)
                        |
                        |  YES
                        +-----------------------+
                                                |
                                            Up? vs Down ?
                                            UP  |  Down
                        +-----------------------+----------------------+
                        |                                              |
               possible scroll up ?                             navigation show ?
                        |                                 (this.scrollContainerPos &&
                  NO    |   YES                           && this.scrollContainer.data('show') == 1)             
             +----------+---------+                                    |
             |                    |                                    |
    navigation hide ?       this.setYScrollPosition                    |
  (this.scrollContainerPos                                             |
  && this.scrollContainer.data('show') == 0)                           |                                      |
             |                                                         |
             |   YES                                              NO   |   YES
             +----------+                                  +-----------+-----------+
                        |                                  |                       |
              this._showIndicate(1)             possible scroll Down ?      this._showIndicate(0)
                                                           |
                                                           |   YES
                                                           +---------+
                                                                     |
                                                           this.setYScrollPosition
