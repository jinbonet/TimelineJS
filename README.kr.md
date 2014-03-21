따오기 타임라인
===============

**[따오기 타임라인][repository-taogi-timeline]**은 [진보네트워크센터][jinbonet]에서 [knight lab][knightlab]의 [TimelineJS][repository-timelinejs]에 미디어 관련 기능을 추가한 PHP & JavaScript 라이브러리입니다. 주된 특징은 다음과 같습니다.

* 웹페이지 주소 분석 패턴을 추가했습니다.
* 미디어 소스로 임베드 코드를 입력할 수 있습니다.
* 타임라인 출력 모델을 선택할 수 있습니다.
* 기본 모델 `touchcarousel`은 네 가지 추가기능을 포함합니다.
  * 터치 인터페이스
  * 갤러리 출력 기능
  * 스킨 선택 기능
  * 반응형 레이아웃이 적용된 기본 스킨

목차
----------------------

1.  설치
    1.  요구 사항 확인
    2.  업로드
    3.  설정
    4.  내용 작성
    5.  배포
2.  데이터 형식
    1.  구글 스프레드시트
    2.  JSON 파일
3.  지원하는 미디어 형식
4.  라이선스

--------------------------------------------------------------------------------

1. 설치
=======

1. 요구 사항 확인
-----------------

따오기 타임라인은 PHP 5.2와 JavaScript로 동작하며, 외부 라이브러리들을 사용하고 있으므로 각 라이브러리들의 요구 사항도 충족되어야 합니다. 사용 중인 라이브러리들의 목록과 라이선스, 저장 위치는 다음과 같습니다.

| 라이브러리                                        | 라이선스              | 디렉토리                                          |
|---------------------------------------------------|-----------------------|---------------------------------------------------|
| [TimelineJS][repository-timelinejs]               | [MPL][license-mpl]    | `model/timelineJS/`                               |
| [jQuery][repository-jquery]                       | [MIT][license-mit]    | `resources/script/jquery-1.11.0.min.js`           |
| [MediaElement.js][repository-mediaelement]        | [MIT][license-mit]    | `resources/mediaelement/`                         |
| [PDFObject][repository-pdfobject]                 | [MIT][license-mit]    | `resources/pdfobject/`                            |
| [PHP Proxy][repository-php-proxy]                 | [MIT][license-mit]    | `library/php-proxy/`                              |
| [Twitteroauth][repository-twitteroauth]           | [?]                   | `library/twitteroauth/`                           |
| [Bootstrap][repository-bootstrap]                 | [MIT][license-mit]    | `model/touchcarousel/fonts/glyphicons-halflings*` |
| [Foundation Icons][repository-foundation-icons]   | [MIT][license-mit]    | `model/touchcarousel/fonts/foundation-icons*`     |

2. 업로드
---------

사용하고자 하는 웹서비스 디렉토리에 업로드한 뒤 권한을 확인합니다. 일반적인 환경이라면 `cache` 폴더의 `other` 쓰기 권한을 부여하는 것으로 충분합니다.

| 디렉토리  | 권한  | 비고                              |
|-----------|-------|-----------------------------------|
| `cache`   | `707` | 타임라인 JSON 파일을 저장합니다.  |

~~~~
chmod 707 cache
~~~~

3. 설정
-------

(생략 가능) `conf/config.php`에서 기본 모델, [페이스북 앱 아이디][resource-facebook-app], 언어 등의 기본 설정을 변경할 수 있습니다.

| 변수                                  | 기본값            | 선택지                                            |
|---------------------------------------|-------------------|---------------------------------------------------|
| `$timelineConfig['default_model']`    | `touchcarousel`   | **4. 내용 작성** 항목의 `model` 매개변수 참조     |
| `$timelineConfig['cache']`            | `60`              |                                                   |
| `$timelineConfig['cache_path']`       | `./cache`         |                                                   |
| `$timelineConfig['use_sns']`          | `true`            | `true, false`                                     |
| `$timelineConfig['fb_app']`           | 없음              | 페이스북 앱 아이디                                |
| `$timelineConfig['theme']`            | `defaults`        | **4. 내용 작성** 항목의 `skinname` 매개변수 참조  |
| `$timelineConfig['taogiauth']`        | 없음              | 임의의 문자열                                     |
| `$timelineConfig['lang']`             | `ko_KR`           | `ko_KR, en_US`                                    |

4. 내용 작성
------------

1.  **2. 데이터 형식** 항목을 참조해서 타임라인으로 구성하고자 하는 내용을 작성합니다.
2.  따오기 타임라인이 설치된 웹서비스 주소를 `src` 매개변수로 `json` 파일 경로를 지정해서 호출합니다.

~~~~
http://yourdomain.com/taogi-timeline/?src=yourfile.json&model=touchcarousel
~~~~

`src` 매개변수와 같이 주소 형식으로 지정할 수 있는 설정값은 다음과 같습니다.

| 매개변수      | 값                    | 기본값            | 선택지                        |
|---------------|-----------------------|-------------------|-------------------------------|
| `src`         | `json` 파일의 `URI`   | 없음(필수)        |                               |
| `model`       | 사용할 출력 모델      | `touchcarousel`   | `touchcarousel, timelineJS`   |
| `skinname`    | 사용할 스킨 이름      | `default`         |                               |

2. 데이터 형식
==============

1. 구글 스프레드시트
--------------------

[TimelineJS에서 지원하는 스프레드시트 형식][resource-timelinejs-spreadsheet-template]을 그대로 쓸 수 있습니다. 단, 이 경우에는 갤러리를 사용할 수 없게 됩니다.

2. JSON 파일
------------

따오기 타임라인에서 사용하는 JSON 파일은 TimelineJS에서 사용하는 JSON 파일 형식에 추가정보와 각 슬라이드별 갤러리 항목을 추가한 것입니다. 그러므로 TimelineJS 형식의 JSON 파일을 사용할 경우에는 추가 기능이 적용되지 않습니다. 다음 JSON 예제를 참고하세요.

~~~~
{ 
    "timeline":
    {
        "headline":"타임라인 제목",
        "type":"default",
        "startDate":"타임라인 시작 날짜",
        "text":"타임라인 설명",
        "asset": // 타임라인 표지 설정.
        {
            "media":"타임라인 표지 그림 소스",
            "credit":"타임라인 표지 그림의 저자 정보",
            "caption":"타임라인 표지 그림 설명"
        },
        "extra": // 타임라인 추가정보.
        {
            "template":"사용할 템플릿 이름", // touchcarousel(기본값), timelinejs, etc... -- 대소문자를 구분하지 않습니다.
            "author":"타임라인 저자 정보",
            "theme": // 모양새 설정, timelinejs에는 적용되지 않습니다.
            {
                "background":"문서 배경색",
                "canvas":"타임라인 영역 배경색",
                "cover": // 표지 설정
                {
                    "background":"표지 배경색",
                    "subject": // 표지 제목 모양새.
                    {
                        "font-family":"표지 제목 글꼴 이름",
                        "color":"표지 제목 글자 색상"
                    },
                    "summary": // 표지 본문 모양새.
                    {
                        "font-family":"표지 본문 글꼴 이름",
                        "color":"표지 본문 글자 색상"
                    }
                },
                "post": // 슬라이드 설정.
                {
                    "background":"슬라이드 배경색",
                    "subject": // 슬라이드 제목 모양새.
                    {
                        "font-family":"슬라이드 제목 글꼴 이름",
                        "color":"슬라이드 제목 글자 색상"
                    },
                    "summary": // 슬라이드 본문 모양새.
                    {
                        "font-family":"슬라이드 본문 글꼴 이름",
                        "color":"슬라이드 본문 글자 색상"
                    }
                }
            }
        },
        "date": // 날짜별 슬라이드 데이터
        [
            {
                "startDate":"슬라이드(1) 시작 날짜",
                "headline":"슬라이드(1) 제목",
                "text":"슬라이드(1) 설명",
                "asset": // 슬라이드 피쳐
                {
                    "media":"슬라이드(1)의 미디어(1) 소스",
                    "thumbnail":"슬라이드(1)의 미디어(1) 미리보기 그림 주소",
                    "credit":"슬라이드(1)의 미디어(1) 저자 정보",
                    "caption":"슬라이드(1)의 미디어(1) 설명"
                },
                "media": // 갤러리
                [
                    {
                        "media":"슬라이드(1)의 미디어(1) 소스",
                        "thumbnail":"슬라이드(1)의 미디어(1) 미리보기 그림 주소",
                        "credit":"슬라이드(1)의 미디어(1) 저자 정보",
                        "caption":"슬라이드(1)의 미디어(1) 설명"
                    },
                    {
                        "media":"슬라이드(1)의 미디어(2) 소스",
                        "thumbnail":"슬라이드(1)의 미디어(2) 미리보기 그림 주소",
                        "credit":"슬라이드(1)의 미디어(2) 저자 정보",
                        "caption":"슬라이드(1)의 미디어(2) 설명"
                    },
                    {
                        "media":"슬라이드(1)의 미디어(3) 소스",
                        "thumbnail":"슬라이드(1)의 미디어(3) 미리보기 그림 주소",
                        "credit":"슬라이드(1)의 미디어(3) 저자 정보",
                        "caption":"슬라이드(1)의 미디어(3) 설명"
                    }
                ]
            },
            {
                "startDate":"슬라이드(2) 시작 날짜",
                "headline":"슬라이드(2) 제목",
                "text":"슬라이드(2) 설명",
                "asset":
                {
                    "media":"슬라이드(2)의 미디어(1) 소스",
                    "thumbnail":"슬라이드(2)의 미디어(1) 미리보기 그림 주소",
                    "credit":"슬라이드(2)의 미디어(1) 저자 정보",
                    "caption":"슬라이드(2)의 미디어(1) 설명"
                }
            },
            {
                "startDate":"슬라이드(3) 시작 날짜",
                "headline":"슬라이드(3) 제목",
                "text":"슬라이드(3) 설명",
            },
        ]
    }
}
~~~~

3. 지원하는 미디어 형식
=======================

`media` 필드에는 TimelineJS와 마찬가지로 몇 가지 형식의 미디어 소스를 입력할 수 있습니다. 기본적으로는 웹페이지 주소를 입력받아 [Facebook Open Graph Protocol][resource-og], [Twitter Cards Protocol][resource-twittercards], API 등을 이용해서 마크업을 출력하고, 적당한 마크업을 얻어낼 수 없으면 [Page Peeker][resource-pagepeeker]를 이용해서 해당 페이지의 캡쳐 이미지를 사용합니다. 파일 주소, 임베드 코드 등을 직접 입력할 수도 있습니다. 유튜브처럼 웹페이지 주소를 통한 API 호출 기능, Open Graph, 임베드 코드를 모두 제공하는 경우에는 원하는 입력방식을 선택할 수 있습니다.

| 형식          | 처리                                                                                              |
|---------------|---------------------------------------------------------------------------------------------------|
| 웹페이지 주소 | `http:`로 시작하는 주소를 입력할 경우 웹페이지 주소로 처리합니다.                                 |
| 파일 주소     | `http:`로 시작하는 주소에 확장자가 포함된 경우에는 파일 주소로 처리합니다.                        |
| 임베드 코드   | `<object>`, `<embed>`, `<iframe>` 태그를 임베드 코드로 처리합니다.                                |
| 파일 내용     | 위 항목에 해당하지 않는 경우에는 파일 내용을 직접 입력한 것으로 처리합니다. (예를 들어, 인용문)   |

4. 라이선스
===========

따오기 타임라인의 고유 파일들은 [MPL 2.0][license-mpl] 라이선스를 따르며, 포함된 라이브러리 파일들은 각자의 라이선스를 따릅니다. 라이브러리 목록은 **1. 설치 - 1. 요구 사항 확인** 항목에서 확인할 수 있습니다.

[jinbonet]:     https://github.com/jinbonet
[knightlab]:    https://github.com/NUKnightLab

[resource-facebook-app]:                    https://developers.facebook.com/apps
[resource-timelinejs-spreadsheet-template]: https://drive.google.com/previewtemplate?id=0AppSVxABhnltdEhzQjQ4MlpOaldjTmZLclQxQWFTOUE&mode=public&pli=1#
[resource-og]:                              https://developers.facebook.com/docs/opengraph/
[resource-twittercards]:                    https://dev.twitter.com/docs/cards
[resource-pagepeeker]:                      http://pagepeeker.com

[repository-taogi-timeline]:    https://github.com/jinbonet/taogi-timeline
[repository-timelinejs]:        https://github.com/NUKnightLab/TimelineJS
[repository-jquery]:            https://github.com/jquery/jquery
[repository-mediaelement]:      https://github.com/johndyer/mediaelement
[repository-pdfobject]:         https://github.com/pipwerks/PDFObject
[repository-php-proxy]:         https://github.com/jenssegers/php-proxy
[repository-twitteroauth]:      https://github.com/abraham/twitteroauth
[repository-bootstrap]:         https://github.com/twbs/bootstrap
[repository-foundation-icons]:  https://github.com/zurb/foundation-icons

[license-mpl]: http://mozilla.org/MPL/2.0/
[license-mit]: http://opensource.org/licenses/MIT