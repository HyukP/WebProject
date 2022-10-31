import os
import sys
import urllib.request


def getName(name, age):
    print (name + " : " + age)

if __name__ == '__main__':
    getName(sys.argv[1], sys.argv[2])

client_id = "7HK9tPsLi9yFUjvwDzx1"
client_secret ="6uWchEawHA"
encText = urllib.parse.quote("승인")
data = "source=ko&target=vi&text=" + encText
url = "https://openapi.naver.com/v1/papago/n2mt"
request = urllib.request.Request(url)
request.add_header("X-Naver-Client-Id",client_id)
request.add_header("X-Naver-Client-Secret",client_secret)
response = urllib.request.urlopen(request, data=data.encode("utf-8"))
rescode = response.getcode()
if(rescode==200):
    response_body = response.read()
    print(response_body.decode('utf-8'))
else:
    print("Error Code:" + rescode)